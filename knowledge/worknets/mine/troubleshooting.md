# Mine WorkNet Troubleshooting

## Diagnosis Flow

1. Run `python scripts/run_tool.py doctor`
2. Check the JSON output for specific errors
3. Follow the fix instructions below

## Common Errors

### `ModuleNotFoundError` / missing packages
**Fix**: Run bootstrap:
```bash
cd {baseDir} && bash scripts/bootstrap.sh
```

### `address_not_registered`
**Cause**: Wallet not registered on AWP RootNet
**Fix**: Install AWP Skill and register:
```bash
skill install https://github.com/awp-core/awp-skill
# Then: "awp start"
```

### `401` / `missing_auth_headers` / `invalid_signature`
**Cause**: EIP-712 signature issue
**Fix**: Run `doctor` to diagnose. Never make direct HTTP calls.

### `signer_mismatch`
**Cause**: Request bypassed `run_tool.py`
**Fix**: Always use standard commands.

### `dedup_hash_in_cooldown`
**Cause**: Duplicate content already submitted
**Action**: Normal — agent skips and picks new URL.

### `rate_limit_exceeded`
**Cause**: Submission cap reached for this epoch
**Action**: Wait for next epoch. Credit score improves with qualifying epochs.

### `challenge_required`
**Cause**: PoW challenge required
**Action**: Agent auto-solves and resubmits.

## Validator Errors

### `403` / `insufficient_stake`
**Cause**: Validator stake below 10,000 AWP
**Fix**: Use AWP Skill to stake more:
```bash
awp allocate --worknet 845300000002 --amount 10000
```

### `no_llm_backend`
**Cause**: No LLM backend for evaluation
**Fix** (pick one):
- Install OpenClaw CLI
- Set `MINE_GATEWAY_TOKEN` env var

## Miner Not Earning

### Symptom: `processed=0 submitted=0`
This is normal early on — miner is running and pulling Discovery seeds.

**Do NOT say** "waiting for platform to assign tasks" — miners are self-driven.

Check status: `python scripts/run_tool.py agent-control status`

### Symptom: Submissions but zero rewards
Check epoch eligibility:
- Tasks > **10**
- Average score > **60**

If either not met, ALL submissions rejected.

## Credit Tiers

| Tier | Score | Max/epoch | PoW rate |
|------|-------|-----------|----------|
| novice | 0-19 | 100 | 100% |
| restricted | 20-39 | 500 | 50% |
| normal | 40-59 | 2000 | 20% |
| good | 60-79 | 10000 | 5% |
| excellent | 80-100 | unlimited | 1% |
