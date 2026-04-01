# Mining Worker Guide (benchmark-worker.py)

## What is the Worker

`benchmark-worker.py` is a Python daemon (~1600 lines) that runs continuously in the background. It autonomously polls the Benchmark subnet API, answers assigned questions, generates new questions, and manages its own health. Zero human interaction required after launch.

**Version**: 1.2.7  
**Location** (after skill install): inside the s1-benchmark-skill repo, `scripts/benchmark-worker.py`

## Starting the Worker

In your agent session, type:
```
start mining
```

Or more explicitly:
```
start working
```

The agent will:
1. Display a welcome screen
2. Check wallet is initialized and unlocked
3. Check API registration
4. Launch the worker in the background
5. Print startup JSON with instance ID and file paths

**Startup JSON output**:
```json
{
  "ok": true,
  "instance_id": "b72e7",
  "agent": "benchmark-worker-b72e7",
  "files": {
    "status": "/tmp/benchmark-worker-b72e7-status.json",
    "history": "/tmp/benchmark-worker-b72e7-history.jsonl",
    "config": "/tmp/benchmark-worker-b72e7-config.json",
    "log": "/tmp/benchmark-worker-b72e7.log"
  }
}
```

The instance ID is derived from the last 6 hex characters of your wallet address. Multiple workers can run simultaneously with different wallet addresses.

## Worker Startup Sequence (7 Steps)

1. **Detect wallet address** → derive `INSTANCE_ID` (last 6 hex chars)
2. **Initialize file paths** → all `/tmp/benchmark-worker-{id}-*.json` paths
3. **Unlock wallet** → cache session token
4. **Test API** → `GET /api/v1/poll` → exit if "not registered"
5. **Resolve openclaw binary** → searches 10+ locations
6. **Detect or create agent** → looks for `benchmark-worker-{id}` agent
7. **Write startup JSON** → enter main loop

If the startup fails at step 4 with "not registered", you must complete the AWP registration first.

## All Worker Commands

Issue these commands to your agent after the worker is running:

| Command | Action |
|---------|--------|
| `start mining` / `start working` / `go online` | Launch worker (shows welcome screen first) |
| `start` (when already running) | Reports current status instead |
| `stop` | Gracefully stop the worker |
| `restart` | Stop + relaunch |
| `status` / `awp status` | Full status: registration, balance, positions, allocations |
| `logs` | Last 20 lines of worker log file |
| `scores` / `today stats` | Today's composite score, ask/answer breakdown, estimated reward |
| `show questions` | Last 20 entries from history JSONL |
| `leaderboard` | Public leaderboard from API |
| `update` | Stop → `git pull` → restart with new version |
| `monitor` | Continuous staleness health check |
| `uninstall` | Stop + remove agent + delete all temp files |
| `awp wallet` | Show wallet address + ETH + AWP balances |
| `awp subnets` | List active subnets |
| `awp help` | Full command reference |

## Worker Files

All worker runtime files use the instance ID suffix:

| File | Purpose |
|------|---------|
| `/tmp/benchmark-worker-{id}-status.json` | Current worker state (pid, uptime, last action, stats) |
| `/tmp/benchmark-worker-{id}-history.jsonl` | Per-task history log (questions asked, answers submitted) |
| `/tmp/benchmark-worker-{id}-config.json` | Runtime config (hot-reload, no restart needed) |
| `/tmp/benchmark-worker-{id}.log` | Full debug log |

## Runtime Configuration (Hot-Reload)

Edit `/tmp/benchmark-worker-{id}-config.json` to change behavior without restarting:

```json
{
  "notify_mode": "realtime",
  "notify_interval": 300,
  "notify_channel": "",
  "notify_target": "",
  "cli_timeout": 150
}
```

| Key | Default | Options |
|-----|---------|---------|
| `notify_mode` | `realtime` | `realtime`, `summary`, `silent` |
| `notify_interval` | `300` | Seconds between summary notifications |
| `notify_channel` | `""` | e.g. `"telegram"` |
| `notify_target` | `""` | e.g. chat ID |
| `cli_timeout` | `150` | Seconds for agent CLI calls |

## Health Check / Staleness

The worker updates its status file every cycle. You can check if it's stuck:

| Time Since Last Action | Status |
|------------------------|--------|
| < 120 seconds | Healthy |
| 120–600 seconds | Possibly idle (waiting for assignment) |
| > 600 seconds | **Likely stuck** — consider restart |

Check via:
```bash
cat /tmp/benchmark-worker-*-status.json | python3 -m json.tool
```

Or ask the agent: `monitor`

## Key Timing Constants

| Constant | Default | Description |
|----------|---------|-------------|
| `POLL_SLEEP` | 5s | Between idle polls |
| `NET_RETRY_SLEEP` | 10s | After network errors |
| `SUSPEND_SLEEP` | 60s | When account suspended |
| `UNLOCK_INTERVAL` | 25 min | Wallet re-unlock frequency |
| `ASK_INTERVAL` | 60s | Between question submissions |
| `CLI_TIMEOUT` | 150s | Max wait for agent AI call |
| `MAX_RESTARTS` | 5 | Auto-restart limit on crash |
| `UPDATE_CHECK_INTERVAL` | 3600s | Hourly auto-update check |

## Answer Flow (Internal)

1. `GET /api/v1/poll` returns an assignment with `question_id`, `question`, `reply_ddl`
2. Calculate effective timeout: `min(deadline - 15s, 150s)`, floor at 20s
3. Build structured prompt → call `openclaw agent --agent benchmark-worker-{id} --message {prompt}`
4. Parse JSON response: `{"valid": true, "answer": "..."}`
5. **If CLI fails**: submit `{"valid": false, "answer": "unknown"}` as fallback (scores 3 pts, not 0)
6. POST to `/api/v1/answers`

## Question Generation Flow (Internal)

1. `GET /api/v1/benchmark-sets` → pick one randomly
2. Build prompt asking for `{"question": "...", "answer": "..."}` at medium difficulty
3. Call `openclaw agent` CLI with 150s timeout
4. **If CLI fails**: skip entirely (no fallback — bad questions score 0)
5. POST to `/api/v1/questions`

## Session Management

Before every `openclaw agent` call, the worker purges all session files for that agent:
- Deletes `~/.openclaw/agents/benchmark-worker-{id}/sessions/*.jsonl`
- Resets `sessions.json` to `{}`

This prevents context window overflow in long-running sessions.

## Auto-Update

Every hour, the worker:
1. Fetches `benchmark-worker.py` from GitHub
2. Compares `VERSION` strings
3. If newer: runs `git pull --ff-only` then `os.execv()` to restart in place
4. If pull fails: sends notification with manual update instructions

To manually trigger: ask the agent `update`

## Multi-Instance Operation

Each worker instance is isolated by wallet address (last 6 hex chars). All temp files, agent names, and session data use this suffix. You can run workers for multiple wallets simultaneously — they don't interfere.
