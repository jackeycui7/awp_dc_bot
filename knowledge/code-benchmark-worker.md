# Code: benchmark-worker.py Internals

Source: `/root/s1-benchmark-skill/scripts/benchmark-worker.py` (v1.2.7, ~1600 lines)

## Startup Sequence

```python
main()
  1. get_wallet_address()        # awp-wallet receive → parse eoaAddress
     → None → print error JSON → sys.exit(1)
  
  2. INSTANCE_ID = address[-6:].lower()   # e.g. "b72e7f"
     _init_instance_paths()               # set all /tmp/benchmark-worker-{id}-* paths
  
  3. unlock_wallet()             # awp-wallet unlock --duration 3600 --scope full
     → False → print error JSON → sys.exit(1)
  
  4. signed_request("GET", "/api/v1/poll")   # test API connectivity
     "not registered" in response → print error JSON → sys.exit(1)
  
  5. _resolve_openclaw_path()    # search PATH + 10 hardcoded locations
     → warning logged if not found, continues anyway
  
  6. detect_agent()              # find or create "benchmark-worker-{id}" agent
     _purge_agent_sessions()     # clear ~/.openclaw/agents/{id}/sessions/
  
  7. print startup JSON to stdout
     → enter main_loop()
```

## Main Loop

```python
main_loop():
  while not _stop_event.is_set():
    # Refresh wallet session every 25 minutes
    if time.monotonic() - last_unlock >= UNLOCK_INTERVAL:
      unlock_wallet()
      last_unlock = time.monotonic()

    raw = signed_request("GET", "/api/v1/poll")
    
    # Exit conditions
    if "not registered" in raw.lower(): break         # fatal, no restart
    if "suspended" in raw.lower():
      sleep(SUSPEND_SLEEP)  # 60s, then retry
      continue
    
    poll_data = json.loads(raw)
    assigned = poll_data["data"]["assigned"]
    
    if assigned:
      _handle_answer(assigned)
      if time.monotonic() - last_ask >= ASK_INTERVAL:
        _handle_ask()           # opportunistic ask after answering
        last_ask = time.monotonic()
      continue                  # no sleep — poll immediately
    else:
      if time.monotonic() - last_ask >= ASK_INTERVAL:
        _handle_ask()
        last_ask = time.monotonic()
      sleep(POLL_SLEEP)         # 5s idle sleep
```

## Answer Flow: `_handle_answer(assigned)`

```python
_handle_answer(assigned):
  question_id  = assigned["question_id"]
  question     = assigned["question"]
  reply_ddl    = assigned["reply_ddl"]   # ISO timestamp
  
  # Calculate safe timeout
  deadline_secs = (parse(reply_ddl) - now()).total_seconds()
  timeout = min(deadline_secs - 15, CLI_TIMEOUT)  # leave 15s buffer
  timeout = max(timeout, 20)                       # floor at 20s
  
  # Build prompt for openclaw agent
  prompt = f"Answer this question: {question}\n..."
  
  # Call openclaw agent CLI
  result = _call_agent(prompt, timeout)
  
  if result is None:
    # CLI failed → fallback: submit "unknown" (gets 3 pts, not 0)
    answer_payload = {"valid": False, "answer": "unknown"}
    _consecutive_fallbacks += 1
    if _consecutive_fallbacks >= 5:
      _send_notification("[ALERT] 5 consecutive fallbacks")
  else:
    # Parse JSON response from agent
    parsed = json.loads(result)  # expects {"valid": bool, "answer": str}
    answer_payload = parsed
    _consecutive_fallbacks = 0
  
  # Submit to API
  signed_request("POST", "/api/v1/answers",
    body={"assignment_id": ..., **answer_payload})
  
  # Update stats + history JSONL + status file
  _stats["answers"] += 1
  _record_to_history(...)
  _write_status()
```

## Question Generation Flow: `_handle_ask()`

```python
_handle_ask():
  # Fetch available benchmark sets
  sets_raw = signed_request("GET", "/api/v1/benchmark-sets")
  chosen = random.choice(sets_raw["data"])
  
  # Build generation prompt
  prompt = f"Generate a benchmark question for topic: {chosen['topic']}\n
             Return JSON: {{\"question\": \"...\", \"answer\": \"...\"}}\n
             Target difficulty: 1-3 out of 5 agents should get it right."
  
  result = _call_agent(prompt, CLI_TIMEOUT)
  
  if result is None:
    # NO FALLBACK for ask — bad questions score 0, just skip
    log.warning("[ASK] no valid response, skipping")
    return
  
  parsed = json.loads(result)
  
  # Submit question
  signed_request("POST", "/api/v1/questions", body={
    "bs_id": chosen["bs_id"],
    "question": parsed["question"],
    "answer": parsed["answer"]
  })
  
  _stats["questions"] += 1
```

## Agent CLI Call: `_call_agent(prompt, timeout)`

```python
_call_agent(prompt, timeout):
  # Purge sessions BEFORE every call (prevent context overflow)
  _purge_agent_sessions()
  
  cmd = [openclaw_path, "agent",
         "--agent", _agent_id,
         "--message", prompt]
  
  proc = subprocess.Popen(cmd, stdout=PIPE, stderr=PIPE, env=sub_env)
  
  try:
    stdout, stderr = proc.communicate(timeout=timeout)
  except subprocess.TimeoutExpired:
    proc.kill()
    log.warning("[AGENT] CLI timeout (%ds)", timeout)
    return None
  
  # Rate limit detection
  if any(k in stderr for k in ["429", "rate", "Extra usage"]):
    log.warning("[AGENT] rate limit, backing off 60s")
    sleep(60)
    return None
  
  if proc.returncode != 0:
    log.warning("[AGENT] CLI failed (exit %d)", proc.returncode)
    return None
  
  return stdout.decode().strip()
```

## Session Management

Two session layers, both purged before agent calls:

1. **Wallet session** (AWP_SESSION_TOKEN): auto-refreshed every 25 min via `awp-wallet unlock`
2. **OpenClaw agent sessions** (~/.openclaw/agents/{id}/sessions/): purged before EVERY `_call_agent()` call
   - Deletes all `*.jsonl` files in the sessions directory
   - Resets `sessions.json` to `{}`
   - Prevents context window overflow in long-running workers

## Auto-Restart on Crash

```python
# In main():
for attempt in range(MAX_RESTARTS + 1):   # MAX_RESTARTS = 5
  try:
    main_loop()
    break   # clean exit or "not registered" — don't restart
  except SystemExit:
    break   # explicit sys.exit() — don't restart
  except Exception as exc:
    log.error("[CRASH] %s: %s", type(exc).__name__, exc)
    if attempt >= MAX_RESTARTS:
      log.error("[CRASH] exceeded %d restarts, giving up", MAX_RESTARTS)
      break
    sleep(RESTART_COOLDOWN)   # 10s between restarts
```

## Auto-Update (Hourly)

```python
_check_for_update():
  # Fetch remote benchmark-worker.py
  remote = fetch_raw_github_file(...)
  remote_version = parse_version(remote)
  
  if remote_version <= current_version: return
  
  # Update in place
  result = subprocess.run(["git", "pull", "--ff-only"])
  if result.returncode == 0:
    os.execv(sys.executable, [sys.executable] + sys.argv)  # restart with new binary
  else:
    _send_notification("[UPDATE] git pull failed, manual update needed")
```

## Status File Schema

`/tmp/benchmark-worker-{id}-status.json`:
```json
{
  "pid": 12345,
  "instance_id": "b72e7f",
  "worker_address": "0x...",
  "uptime_seconds": 3600,
  "last_action": "answered question_id=42",
  "last_action_time": 1712000000.0,
  "stats": {
    "questions": 10,
    "answers": 24,
    "fallbacks": 1,
    "errors": 0
  }
}
```

**Staleness thresholds** (for health check):
- `time.now() - last_action_time < 120s` → healthy
- `120–600s` → possibly idle (waiting for assignment)
- `> 600s` → likely stuck, consider restart

## Key Constants (All Configurable via Config File)

| Constant | Default | Location |
|----------|---------|----------|
| POLL_SLEEP | 5s | hardcoded |
| NET_RETRY_SLEEP | 10s | hardcoded |
| SUSPEND_SLEEP | 60s | hardcoded |
| UNLOCK_INTERVAL | 25 min | hardcoded |
| ASK_INTERVAL | 60s | hardcoded |
| CLI_TIMEOUT | 150s | config.json `cli_timeout` |
| MAX_RESTARTS | 5 | hardcoded |
| UPDATE_CHECK_INTERVAL | 3600s | hardcoded |
