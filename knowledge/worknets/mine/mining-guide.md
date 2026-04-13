# Mining Worker Guide (mine-skill)

## What is the Worker

The mine-skill runs a Python daemon that operates continuously in the background. It autonomously crawls public data, structures it, and submits to the Mine Worknet platform. Zero human interaction required after launch.

**Skill repo**: `https://github.com/awp-worknet/mine-skill`

## Agent-First Design

All commands are designed for **agent execution** — the agent runs commands in the terminal and presents results to the user in natural language. Users never need to see or type command text.

Every command outputs JSON with:
- `user_message` — show this to the user (natural language)
- `user_actions` — action options to present
- `_internal` — for the agent only, contains `action_map` mapping labels to commands

## Starting the Miner

In your agent session, say:
```
start mining
```

The agent will:
1. Run bootstrap (installs dependencies, first time only)
2. Check wallet registration
3. Launch the background worker
4. Report startup status

## All Worker Commands

| User Intent | Agent Command |
|-------------|---------------|
| Start mining | `agent-start` |
| Check status | `agent-control status` |
| Pause mining | `agent-control pause` |
| Resume mining | `agent-control resume` |
| Stop mining | `agent-control stop` |
| List datasets | `list-datasets` |
| Diagnose issues | `doctor` |

All commands are invoked via `python scripts/run_tool.py <command>`.

## Task Acquisition Model

**Critical**: Miners are self-driven. They do NOT wait for the platform to push tasks.

| Source | Description |
|--------|-------------|
| **Dataset Discovery** | Miner generates seed URLs from dataset `source_domains` (Wikipedia random API, arXiv listings, Amazon categories) |
| **Backend Claim** | Opportunistic repeat-crawl tasks from the platform |
| **Resume Queue** | Retry previously failed or paused tasks |

If a miner shows `processed=0`, it means Discovery hasn't produced a followup yet — NOT that it's waiting for an assignment.

## Mining Iteration Loop

Each iteration:
1. `POST /api/mining/v1/heartbeat` — refresh online status
2. Collect tasks from three sources (Discovery, Backend Claim, Resume)
3. For each URL:
   - `GET /api/core/v1/url/check` — check URL occupancy BEFORE crawling
   - Crawl the page
   - `POST /api/core/v1/dedup-occupancies/check` — check content dedup
   - `GET /api/mining/v1/miners/me/submission-gate` — check PoW status
   - `POST /api/mining/v1/submissions` — submit structured data
4. Sleep briefly, repeat

## Credit Score System

Credit score affects submission caps and PoW probability.

| Tier | Score | Max submissions/epoch | PoW rate |
|------|-------|----------------------|----------|
| novice | 0–19 | 100 | 100% |
| restricted | 20–39 | 500 | 50% |
| normal | 40–59 | 2,000 | 20% |
| good | 60–79 | 10,000 | 5% |
| excellent | 80–100 | unlimited | 1% |

Credit changes:
- Qualifying epoch: +5 points
- Failing epoch: -15 points
- 3 consecutive fails: reset to 0

## Epoch Eligibility

To qualify for rewards in an epoch:
- Daily submissions >= **80**
- Average score >= **60**

If either condition is not met, ALL submissions for that epoch are rejected.

## Worker Files

| File | Purpose |
|------|---------|
| `output/agent-runs/<session_id>.log` | Debug log |
| Status file path in `_internal.log_path` | Current worker state |

Check `agent-control status` first — it shows recent errors without reading logs directly.

## Error Recovery

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError` | Run `bash scripts/bootstrap.sh` |
| `401` / auth error | Run `doctor` to diagnose |
| `address_not_registered` | Install AWP Skill and register |
| `rate_limit_exceeded` | Normal — epoch limit hit, wait |
| `dedup_hash_in_cooldown` | Normal — duplicate content, agent skips |

## Configuration

No environment variables needed. Everything is auto-detected.

Optional overrides (via `.env` or shell):

| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_BASE_URL` | `https://api.minework.net` | Platform API endpoint |
| `MINER_ID` | `mine-agent` | Miner identifier |
| `WORKER_MAX_PARALLEL` | `3` | Concurrent crawl workers |
