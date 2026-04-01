# Code: subnet-benchmark Go Server Internals

Source: `/root/subnet-benchmark/` (Go 1.24)

## Architecture

```
HTTP (net/http ServeMux, port 8080)
  └── Middleware (auth.go)
        ├── WorkerAuth — EIP-191 signature verification
        └── AdminAuth  — Bearer token (constant-time compare)
  └── Handlers (handler/)
  └── Services (service/)
        ├── QuestionService  — submission + validation
        ├── PollService      — assignment distribution
        ├── AnswerService    — answer submission
        ├── ScoringService   — score computation
        ├── SettlementService — epoch settlement
        └── TimerManager     — per-assignment deadline goroutines
  └── Store (store/) — PostgreSQL queries
  └── Background goroutines
        ├── TimerManager     — assignment deadline enforcement
        ├── SettlementScheduler — daily UTC 01:00 trigger
        └── scoreWg          — async scoring after answer submission
```

## Authentication: How Worker Auth Works

Every authenticated worker request must include:
- `X-Worker-Address` — wallet address
- `X-Signature` — EIP-191 signature
- `X-Timestamp` — Unix timestamp (must be within 30s of server time)

Message being signed:
```
METHOD + PATH + TIMESTAMP + hex(SHA256(body))
```

Verification (auth.go):
```go
// 1. Parse timestamp, reject if abs(now - timestamp) > 30s
// 2. Reconstruct message string
// 3. Recover signer address from signature (EIP-191 personal_sign)
// 4. Compare recovered address to X-Worker-Address header
// 5. For "full auth": check worker.IsSuspended()
// 6. Auto-register new workers (checks AWP RootNet API, skipped in testnet mode)
```

Two auth levels:
- **Full auth** (`POST /questions`, `GET /poll`): checks suspension
- **Light auth** (`POST /answers`, `GET /my/*`): no suspension check (allows completing in-flight answers)

## Question Submission Flow

```go
QuestionService.Submit(ctx, worker, req):
  1. lookup benchmark set by bs_id → if not found/inactive → UserError{invalid_bs}
  2. check rate limit: last question from this worker < 60s ago → UserError{rate_limited}
  3. check field lengths (question ≤ question_maxlen, answer ≤ answer_maxlen) → UserError{field_too_long}
  4. compute MinHash fingerprint (128 functions, 3-gram character shingles)
  5. compare against ALL existing questions in same BS:
     jaccard_similarity = minhash.Jaccard(new, existing)
     if jaccard >= 0.85 → UserError{duplicate}
  6. store question + fingerprint atomically (with total_questions increment)
  7. return question record
```

MinHash implementation: FNV-1a hash family, stored as 128×uint64 BYTEA in PostgreSQL.

## Poll / Assignment Flow

```go
PollService.Poll(ctx, workerAddr):
  // FOR UPDATE SKIP LOCKED prevents concurrent polls from racing
  tx.BEGIN
  
  // Find oldest unscored question from a pool of 100 candidates
  // Excludes: worker's own questions, already assigned to this worker,
  //           timed out ≥ 2 times, already has 5 active assignments
  question = store.SelectPollCandidate(tx, workerAddr)
  
  if question == nil: return {assigned: null}
  
  // Check for existing in-progress assignment (handles reconnect)
  existing = store.FindClaimedAssignment(tx, workerAddr)
  if existing != nil:
    if existing.QuestionID == question.ID: return existing  // same question
    store.TimeoutAssignment(tx, existing.AssignmentID)      // timeout old one
  
  // Create new assignment
  replyDDL = now() + replyTimeout  // default 3 minutes
  assignment = store.CreateAssignment(tx, question.ID, workerAddr, replyDDL)
  
  // Register deadline timer
  timerManager.Schedule(assignment)
  
  tx.COMMIT
  return {assigned: assignment_with_question_text}
  // Note: answer is NOT included — only question text is sent
```

## Answer Submission + Scoring Trigger

```go
AnswerService.Submit(ctx, workerAddr, req):
  assignment = store.GetAssignment(req.AssignmentID)
  
  // Validate: worker matches, status == "claimed", not expired
  if assignment.Worker != workerAddr → UserError{not_found}
  if assignment.Status != "claimed" → UserError{not_found}  // already answered or timed out
  
  // Cancel the deadline timer
  timerManager.Cancel(assignment.AssignmentID)
  
  // Save answer
  store.SetAssignmentReply(assignment.ID, req.Answer, req.Valid)
  
  // Trigger async scoring
  go func() {
    scoreWg.Add(1)
    defer scoreWg.Done()
    scoringService.TryScore(ctx, assignment.QuestionID)
  }()
```

## Scoring Logic (TryScore)

```go
ScoringService.TryScore(ctx, questionID):
  // Only score if enough replies (default: 5)
  // WHERE status = 'submitted' ensures idempotency (concurrent calls are safe)
  question = store.GetQuestion(WHERE status='submitted' AND replies>=5)
  if question == nil: return  // not ready yet
  
  assignments = store.GetAssignmentsForQuestion(questionID)
  
  // Classify assignments
  invalidAssigns = [a for a in assignments if a.Valid == false]
  
  // Case 1: All invalid
  if len(invalidAssigns) == len(assignments):
    questioner.score = 0, questioner.share = 0
    each answerer.score = 5, share = 1/N
  
  // Case 2 & 3: Some valid
  else:
    correctAnswers = [a for a in validAssigns if a.Answer == question.ReferenceAnswer]
    N_correct = len(correctAnswers)
    
    if N_correct == 0:
      // No correct answers — majority group wins
      questioner.score = 1, share = 0.1
      groups = groupBy(validAssigns, answer)  // + invalid group
      largestGroup = max(groups, key=len)
      largestGroup members: score=5, share=1/len(largestGroup)
      others: score=2, share=0
    else:
      // Sweet spot scoring table
      questioner.score, questioner.share = scoreTable[N_correct]
      correctAnswerers: score=5, share=1/N_correct
      wrongAnswerers: score=3, share=0
      invalidAnswerers: score=2, share=0
  
  store.SetQuestionScored(questionID, questioner_score, questioner_share)
  store.SetAssignmentScores(assignments, scores, shares)
  
  // Check for suspension
  store.CheckAndSuspendWorker(questioner_address, cfg)
```

## Epoch Settlement

Runs daily at UTC 01:00 via `SettlementScheduler`, also triggerable via admin API.

```go
SettlementService.Settle(ctx, epochDate):
  // Idempotent: deletes previous results for this epoch first
  store.DeleteEpochRewards(epochDate)
  store.ResetBenchmarkFlags(epochDate)
  
  // Collect all scored questions and assignments for this epoch
  questions = store.ListScoredQuestions(epochDate)
  assignments = store.ListScoredAssignments(epochDate)
  
  // Calculate per-worker rewards
  base_reward = total_pool / len(questions)
  ask_pool = base_reward × 1/3
  ans_pool = base_reward × 2/3
  
  for each worker:
    raw = Σ(ask_pool × q.share for q in worker.questions)
       + Σ(ans_pool × a.share for a in worker.assignments)
    
    ask_avg = mean(q.score for q in worker.questions)    // 0 if no questions
    ans_avg = mean(a.score for a in worker.assignments+timeouts)  // 0 if no answers
    
    if both roles: composite = (ask_avg + ans_avg) / 10
    elif ask only: composite = ask_avg / 10
    elif ans only: composite = ans_avg / 10
    
    final = 0 if scored_tasks < 10 else raw × composite
  
  // Resolve reward recipients (via AWP RootNet API)
  // Multiple workers sharing a recipient → aggregate their rewards
  
  // Build Merkle tree (OpenZeppelin compatible)
  // leaf = keccak256(keccak256(abi.encode(address, amount)))
  
  // Publish root on-chain via SubnetManager.setMerkleRoot(epochUint32, root)
  // Store proofs in merkle_proofs table
```

## Assignment Deadline Enforcement (TimerManager)

```go
// On assignment creation:
timer = time.AfterFunc(replyDDL - now(), func() {
  store.TimeoutAssignment(assignmentID)   // status → "timed-out", score=0
  scoringService.MaybeCheckSuspension(worker)
  scoringService.TryScore(questionID)     // may trigger scoring if enough replies
})
timers[assignmentID] = timer

// On answer submission: timer.Stop()
// On server restart: scan DB for "claimed" assignments, rebuild timers
```

## Runtime Config Hot-Reload

All 16 config keys live in `system_config` table. `RuntimeConfig.Load()` re-reads them on every request cycle (or on explicit admin update). No server restart needed.

Key configs that affect support questions:

| Key | Default | Effect |
|-----|---------|--------|
| `question.reply_timeout_sec` | 180 | Assignment deadline (3 min) |
| `question.rate_limit_sec` | 60 | Min seconds between question submissions |
| `question.similarity_max` | 0.85 | Jaccard threshold for duplicate detection |
| `settlement.min_tasks` | 10 | Min scored tasks for non-zero reward |
| `suspension.base_minutes` | 10 | First suspension duration (doubles per violation) |
| `network.testnet_mode` | false | Skip RootNet check + on-chain publishing |
