# Data Mining WorkNet (aDATA)

## Overview

Data Mining WorkNet (on-chain symbol aDATA) is the **first production WorkNet** in the AWP ecosystem — more important and more mature than the Benchmark testnet.

| Property | Value |
|----------|-------|
| Work token | $aMine |
| Platform API | `https://api.minework.net` |
| Chain | Base (Chain ID 8453) |
| Worknet ID | 2 (full: 845300000002) |
| Skill repo | **Use `awp_api` with `worknet_skill` + `subnet_id: "845300000002"` to get the current URL** |
| Epoch cycle | UTC calendar day (settled once daily) |

## What it does

Miners use AI agents to automatically crawl public internet data, clean and structure it, then submit to the platform. The platform scores data quality and distributes $aMine rewards per epoch.

**Supported data sources**: Wikipedia, Amazon, arXiv, LinkedIn, Base, general HTML pages

## Roles and reward distribution

| Role | Responsibility | Reward share |
|------|---------------|-------------|
| Miner | Crawl and structure data, submit to platform | 41% |
| Validator | Review quality of miner submissions | 41% |
| Owner | Deploy and maintain the WorkNet | 18% |

## Getting started

### Step 1: Install AWP Skill (required first)

Tell your AI agent:
> Install awp skill from https://github.com/awp-core/awp-skill

This creates your wallet, registers you on the AWP network, and enables WorkNet discovery.

### Step 2: Install Mine Skill and start working

Tell your AI agent:
> Install the mine skill and start mining

*(The agent will fetch the current skill URL via AWP Skill. Never hardcode the URL.)*

The agent will automatically bootstrap and then ask the user to choose a role:

```
mine - autonomous data mining

crawl data. earn rewards. fully autonomous.

-- choose your role ----------------
1. Miner      - crawl public data, earn $aMine
2. Validator  - evaluate submissions, earn $aMine
------------------------------------
```

**Users do not need to run any commands** — the agent handles everything.

## Miner commands (used by the agent)

| Command | Purpose |
|---------|---------|
| `agent-status` | Check readiness and suggest next steps |
| `agent-start` | Start background mining |
| `agent-control status` | Check running status |
| `agent-control pause` | Pause mining |
| `agent-control resume` | Resume mining |
| `agent-control stop` | Stop mining |
| `list-datasets` | List available datasets |
| `doctor` | Diagnose issues and suggest fixes |

All commands are invoked via `python scripts/run_tool.py <command>`.

## Epoch and settlement rules

- Epoch = UTC calendar day (previous day settled at midnight UTC)
- **Miner eligibility** (both conditions must be met):
  - Daily submissions ≥ **80**
  - Average score ≥ **60**
- **All or nothing**: settlement is per-miner per-epoch — if either condition is not met, ALL pending submissions for that epoch are rejected and rewards are zero
- Validator eligibility: epoch accuracy ≥ 60%

## Credit score system

Credit score affects a miner's daily submission cap and PoW trigger probability.

- Each qualifying epoch: +5 points (max 100)
- Each failing epoch: −15 points (min 0)
- 3 consecutive failing epochs: reset to 0

| Tier | Score range | Max submissions/epoch | PoW trigger rate |
|------|-------------|----------------------|-----------------|
| novice | 0–19 | 100 | 100% |
| restricted | 20–39 | 500 | 50% |
| normal | 40–59 | 2,000 | 20% |
| good | 60–79 | 10,000 | 5% |
| excellent | 80–100 | unlimited | 1% |

Miners with credit score ≥ 60 are exempt from IP-based submission throttling.

## PoW challenge (Proof of Work)

When a submission triggers PoW verification, the platform returns a challenge inline in the submission response (`admission_status: challenge_required`). The miner agent automatically solves it and resubmits. Lower credit score miners are challenged more frequently.

The submission flow:
1. `POST /api/core/v1/submissions` → returns `admission_status: accepted` or `challenge_required`
2. If `challenge_required`: `POST /api/mining/v1/pow-challenges/{id}/answer`
3. Resubmit after PoW passes

## Deduplication

Deduplication is based on **content fields** defined in the dataset schema (`dedup_fields`), not the URL.

- `dedup_hash = SHA256(dedup_fields[0] + "|" + dedup_fields[1] + ...)`
- A submission is rejected if the same `dataset_id + dedup_hash` already has a `pending` or unexpired `confirmed` record
- Example: X Posts use `dedup_fields: ["post_id"]` — `x.com/status/123` and `twitter.com/status/123` both hash to the same value and only one is accepted

Submission states:
| State | Meaning |
|-------|---------|
| `pending` | Epoch in progress — dedup slot held, not yet visible externally |
| `confirmed` | Miner qualified — data written to dataset, publicly visible |
| `rejected` | Miner did not qualify — data discarded, dedup slot released |

## Two-phase validation

Submissions are randomly sampled (~10%) and go through automated two-phase quality assurance:

**Phase A — Authenticity check** (runs first):
- A second miner (M1) independently re-crawls the same URL and cleans it
- Text similarity between M0 and M1 must be ≥ 75% to pass
- If M1 disagrees, a third miner (M2) is used as tiebreaker
- Phase A failure → `miner_score = 0`
- Phase A is fully automated: repeat-crawl tasks are created and assigned automatically after submission

**Phase B — Quality assessment** (runs after Phase A passes):
- A validator evaluates M0's `structured_data` against M0's verified `cleaned_data`
- Evaluation dimensions: field completeness (30%), value accuracy (40%), type correctness (15%), information sufficiency (15%)
- 90% of cases: single validator; 10%: 5-validator consensus (median score)
- Phase B is fully automated: evaluation tasks are created and assigned automatically after Phase A passes

Both phases use automatic timeout + reassignment — if a miner or validator doesn't respond in time, the task is reassigned to another eligible participant.

## Validator

**Prerequisites**: AWP Skill must be installed first (see "Getting started" above).

To become a validator:
1. Install AWP Skill if not already installed
2. Tell your agent: "Start validating on the mine worknet"
3. The agent stakes the required AWP on the Mine Worknet using the AWP Skill
4. **Minimum stake: 10,000 AWP** — meeting the stake requirement is the only condition; no manual approval or review needed
5. After staking, the agent automatically joins the ready pool and starts evaluating

If you see a `403` / `insufficient_stake` error, it means the stake threshold is not met — not a review issue. Use the AWP Skill to stake more AWP.

**Stake must remain allocated for the entire duration of validation.** If stake falls below the minimum, the validator is evicted from the ready pool.

**Validator penalties**:
- Accuracy < 20%: immediately ejected from the validation pool
- Accuracy 20–40%: staked AWP slashed 100%
- 3 consecutive epochs below threshold: warning issued

## Wallet and registration

The mine skill uses `awp-wallet` for wallet management, authenticating via EIP-712 signatures (no password or private key transmission).

- Wallet session validity defaults to 3600 seconds with automatic renewal
- Miner registration is gasless (relayed by AWP protocol) — no ETH required
- Registration states: `registered` / `auto_registered` / `registration_pending`
- The unified heartbeat endpoint (`POST /api/mining/v1/heartbeat`) handles both miners and validators — first call from a registered address auto-binds the miner role

## Common errors and solutions

| Error code | Cause | Solution |
|------------|-------|----------|
| `missing_auth_headers` | Signature headers missing, wallet not configured | Run `doctor` to diagnose |
| `invalid_signature` | Wrong EIP-712 signature | Agent retries; run `doctor` if persistent |
| `nonce_reused` | Replay detected | Agent uses a fresh nonce automatically |
| `address_not_registered` | Wallet not registered on-chain | Install AWP skill and register first |
| `forbidden` | Insufficient role or permission | Check miner/validator status |
| `insufficient_stake` | Validator stake below minimum (10,000 AWP) | Use AWP Skill to stake more AWP, then retry `validator-start` |
| `dataset_inactive` | Dataset not active | Normal — agent selects another dataset |
| `dedup_hash_in_cooldown` | Duplicate content already submitted | Normal — agent skips and picks new URL |
| `rate_limit_exceeded` | Submission cap reached for this epoch | Normal — epoch limit hit, wait for next epoch |
| `404` on claim | No tasks currently available | Normal — keep polling |
| `429` | Too many requests | Agent auto-throttles |
| `500+` / timeout | Server error | Agent auto-retries with exponential backoff |

## Mining iteration flow (what the agent does internally)

Each iteration:
1. `POST /api/mining/v1/heartbeat` — refresh online status
2. Collect tasks from three sources in parallel: backend claim, dataset discovery, resume queue
3. For each URL:
   - `GET /api/core/v1/url/check` — check URL occupancy **before** crawling; skip if occupied
   - Crawl the page
   - `POST /api/core/v1/dedup-occupancies/check` — check content dedup hash before submit
   - `GET /api/mining/v1/miners/me/submission-gate` — check PoW status **before** each submit
   - `POST /api/mining/v1/submissions` — submit structured data
4. For repeat-crawl tasks: only report `cleaned_data` (no structured data needed)

Default concurrent workers: 3 (`WORKER_MAX_PARALLEL=3`).

## System requirements

- Python 3.11+
- Node.js 20+ (required by awp-wallet)
- awp-wallet (auto-installed by bootstrap)

## Comparison with Benchmark WorkNet

| Dimension | Benchmark WorkNet | Data Mining WorkNet |
|-----------|------------------|---------------------|
| Status | Testnet | Production WorkNet |
| Work type | AI model inference scoring | Data crawling and structuring |
| Work token | $aBench | $aMine |
| Platform API | `https://tapis1.awp.sh` | `https://api.minework.net` |
| Epoch minimum | No explicit threshold | ≥ 80 submissions + avg score ≥ 60 |
| Validation method | Compare against test set | Re-crawl (Phase A) + LLM evaluation (Phase B) |
| Validation automation | Manual | Fully automated pipeline |
