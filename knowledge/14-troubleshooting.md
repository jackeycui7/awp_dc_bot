# Troubleshooting Guide

## Diagnosis Flow

When a user reports a problem, work through this sequence:
1. **What is the exact error message?** (Ask for screenshot or copy-paste)
2. **Which component?** (wallet / worker / API / registration)
3. **When did it last work?** (never / used to work / just broke)
4. **Check logs**: `tail -50 /tmp/benchmark-worker-*.log`

---

## Problem: Worker Won't Start

### Symptom: `Wallet not initialized`
```
{"ok": false, "error": "Wallet not initialized. Please run awp-wallet init and unlock first."}
```
**Fix**:
```bash
awp-wallet receive    # test if wallet exists
awp-wallet init       # run if receive returns nothing
awp-wallet unlock --duration 3600 --scope full
```

### Symptom: `Failed to unlock wallet`
```
{"ok": false, "error": "Failed to unlock wallet. Please run awp-wallet unlock --duration 3600."}
```
**Fix**:
```bash
awp-wallet unlock --duration 3600 --scope full 2>&1   # see actual error
# Common sub-causes:
# - Wrong password → unset WALLET_PASSWORD
# - Wallet corrupted → awp-wallet import --mnemonic "..."
```

### Symptom: `Not registered on AWP RootNet`
```
{"ok": false, "error": "Not registered on AWP RootNet. Please register via AWP skill first."}
```
**Fix**:
```bash
skill install https://github.com/awp-core/awp-skill
# Then in agent: "start working" → choose Option A → complete registration
```

### Symptom: `openclaw not found`
```
[SETUP] openclaw not found in PATH or common locations
```
**Fix**:
```bash
npm install -g openclaw
export PATH="$(npm bin -g):$PATH"
# Add to ~/.bashrc to persist
```

### Symptom: `awp-wallet: command not found`
**Fix**:
```bash
export PATH="$HOME/.local/bin:$PATH"
source ~/.bashrc
awp-wallet receive    # verify
```

---

## Problem: Worker Running But Not Earning

### Symptom: composite_score = 0 or very low

Check which roles are active:
```bash
benchmark-sign.sh GET /api/v1/workers/0x<address>/today
```

**If ask_count = 0**: Worker isn't generating questions
- Check for `[ASK] failed to fetch benchmark sets` in logs
- Check API connectivity: `curl https://tapis1.awp.sh/api/v1/benchmark-sets`

**If ans_count = 0**: Worker isn't getting assignments
- New workers may wait a few minutes for first assignment
- Check if suspended: look for `[WAIT] suspended` in logs

**If both counts are low** (< 10 total): Not enough tasks for reward threshold
- Worker needs min 10 scored tasks/epoch
- May need to run longer or check if worker is actually looping

### Symptom: All answers scoring 0 (timeouts)

Worker is timing out before deadline:
```bash
# Increase effective AI response time by reducing CLI timeout
# This forces earlier fallback submission (3 pts vs 0 pts for timeout)
cat /tmp/benchmark-worker-*-config.json
# Edit cli_timeout to 120 (forces fallback 30s earlier)
```
Check for rate limiting: `grep "rate limit\|429\|backoff" /tmp/benchmark-worker-*.log`

### Symptom: Many consecutive fallbacks (`[ALERT] X consecutive fallbacks`)

Worker's AI calls are failing:
```bash
# Check openclaw agent is healthy
openclaw agent --agent benchmark-worker-<id> --message "ping"

# Check API key quota (look for 429 errors)
grep "429\|rate\|Extra usage" /tmp/benchmark-worker-*.log

# Check network
curl https://api.anthropic.com/v1/models    # or your AI provider
```

### Symptom: Worker shows healthy but reward is zero

**Most common cause**: Fewer than 10 scored tasks in the epoch.
- Scored tasks = tasks where all 5 assignments have been answered
- A task submitted near end of epoch may not score until next epoch

Check:
```bash
benchmark-sign.sh GET /api/v1/my/epochs/$(date -u +%Y-%m-%d)
# Look at scored_questions + scored_assignments total
```

---

## Problem: Worker Stuck / Not Responding

### Symptom: Status file not updating (> 600 seconds since last action)

```bash
# Check if process is alive
PID=$(cat /tmp/benchmark-worker-*-status.json | python3 -c "import json,sys; print(json.load(sys.stdin)['pid'])")
kill -0 $PID && echo "alive" || echo "dead"

# If dead, check crash logs
tail -20 /tmp/benchmark-worker-*.log

# Restart
openclaw agent --agent benchmark-worker-<id> --message "restart"
```

### Symptom: `[CRASH] exceeded 5 restarts, giving up`

Worker hit a persistent unrecoverable error:
```bash
# Find the actual error
grep "CRASH\|ERROR\|Exception" /tmp/benchmark-worker-*.log | tail -20

# Manual restart after fixing root cause
openclaw agent --agent benchmark-worker-<id> --message "restart"
```

Common root causes:
- OpenClaw binary disappeared or became inaccessible
- Wallet files deleted while worker was running
- Python version changed mid-session

---

## Problem: Wallet / Session Issues

### Symptom: `Invalid or expired session token`

```bash
awp-wallet unlock --duration 3600 --scope full
```

The worker refreshes its session every 25 minutes automatically. If you're getting this error in the worker logs (`[WALLET] unlock failed`), check:
- `awp-wallet unlock --duration 3600 2>&1` — see actual error
- Is `WALLET_PASSWORD` accidentally set? → `unset WALLET_PASSWORD`

### Symptom: `Session token integrity check failed`

Security event — session file was modified externally:
```bash
awp-wallet lock
awp-wallet unlock --duration 3600 --scope full
```

### Symptom: `Wrong password — decryption failed`

```bash
unset WALLET_PASSWORD    # clear if set accidentally
awp-wallet unlock --duration 3600
# If still fails, wallet may be in explicit-password mode
# You need the original password used during init
```

---

## Problem: Registration / Binding

### Symptom: `cycle detected` from relay

You're trying to create a circular binding tree (A→B→A). Check your current binding:
```bash
curl https://tapi.awp.sh/api/users/0x<your_address>
# Look at bound_to field
```
Redesign the binding structure to avoid cycles.

### Symptom: Already registered but worker says "not registered"

Check wallet address being used:
```bash
awp-wallet receive    # get your actual address
curl https://tapi.awp.sh/api/address/0x<address>/check
# Should return: {"registered": true}
```

If using multiple wallets, verify `AWP_AGENT_ID` env var matches what you registered.

---

## Problem: Staking / Transaction Errors

### Symptom: `PositionExpired` when trying to add stake

Your StakeNFT lock has expired. You must withdraw first:
```bash
python3 scripts/onchain-withdraw.py --token-id <id>
# Then create a new deposit
python3 scripts/onchain-deposit.py --amount <amount> --lock-days 30
```

### Symptom: `Insufficient balance for transfer + gas`

Not enough BNB for gas:
```bash
awp-wallet balance --chain bsc   # check BNB balance
# Need at least ~0.001 BNB for most transactions
# Either: send BNB to wallet, or configure PIMLICO_API_KEY for gasless
```

### Symptom: `[!] rate limited. retrying in 60s...`

Hit gasless relay limit (100 req/IP/hour). Worker auto-retries. If persistent, switch to on-chain mode (requires BNB).

---

## Problem: Claimed Rewards but Balance Didn't Change

### Symptom: Claim transaction succeeded but Alpha token balance is still zero

**Check 1 — Did you add the Alpha token to your wallet?**
The Alpha token is a custom ERC20 — wallets don't show unknown tokens by default. Add the token contract address manually in your wallet app (MetaMask, Trust Wallet, etc.).

Get the Alpha token address:
```bash
curl https://tapi.awp.sh/api/subnets/1
# Look for alpha_token field
```

**Check 2 — Was the transaction confirmed?**
```bash
awp-wallet tx-status --hash <tx_hash> --chain bsc
```
If status is `pending`, wait a few more blocks.

**Check 3 — Are you checking the right address?**
If delegated mining is set up, rewards go to the **cold wallet** (bind target), not the hot wallet that did the work.

**Check 4 — Remember 30/70/14**
Only 30% is immediately available. The other 70% vests over 14 days. Your on-chain balance shows 30% of each claim immediately; you need to call the vesting release function daily to unlock the rest.

---

## Problem: Auto-Update Failed / Worker Broken After Update

### Symptom: Worker crashes immediately after `update` command

The `git pull --ff-only` succeeded but the new version has a bug, or there's a Python dependency issue.

**Roll back to previous version**:
```bash
cd $(find ~/.openclaw -name "benchmark-worker.py" 2>/dev/null | head -1 | xargs dirname)
git log --oneline -5   # find the last working commit hash
git checkout <commit_hash> -- scripts/benchmark-worker.py
restart
```

**Check if it's a Python import error**:
```bash
python3 /path/to/benchmark-worker.py --version 2>&1
```

### Symptom: `git pull` fails with merge conflict

```bash
cd <repo_directory>
git fetch origin
git reset --hard origin/main   # discard local changes, take latest
restart
```

### Symptom: Update fails with `fatal: not a git repository`

The worker was installed by copying files rather than cloning. Re-install properly:
```bash
skill install https://github.com/awp-core/s1-benchmark-skill
```

---

## Problem: Transaction Fails / Reverts On-Chain

### Symptom: `Insufficient balance for transfer + gas`
Need BNB on BSC for gas:
```bash
awp-wallet balance --chain bsc   # check current BNB
# Send BNB from exchange or another wallet to your address
awp-wallet receive               # get your address
```
Minimum needed: ~0.001 BNB per transaction.

### Symptom: Transaction stuck pending for 10+ minutes
Low gas price or nonce gap:
```bash
awp-wallet tx-status --hash <tx_hash> --chain bsc
```
If still pending after 30 minutes, it will eventually be dropped by the network. Re-submit with higher gas using `--gas-price` flag.

### Symptom: `execution reverted` on deposit/withdraw
Check the specific revert reason:
```bash
awp-wallet tx-status --hash <tx_hash> --chain bsc
# Look for revert reason in output
```
Common reasons:
- `PositionExpired` → call withdraw first, then re-deposit
- `InsufficientBalance` → not enough AWP approved to StakeNFT contract
- `LockNotExpired` → lock period hasn't ended yet, cannot withdraw

---

## Getting More Help

If none of the above resolves the issue:

1. **Check the logs** thoroughly: `tail -100 /tmp/benchmark-worker-*.log`
2. **Check GitHub issues**: https://github.com/awp-core
3. **Ask in Discord** with:
   - Exact error message (screenshot or copy-paste)
   - Output of `awp-wallet receive`
   - Output of `curl https://tapi.awp.sh/api/health`
   - Last 20 lines of worker log
