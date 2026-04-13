# Error Index — AWP Protocol Errors

> **Agent-internal reference**: Commands shown here are for the agent to run, not the user.

## awp-wallet Errors

### `No wallet found. Run 'init' first.`
- **Cause**: Wallet not initialized
- **Fix**: `awp-wallet setup`

### `Wallet already exists.`
- **Cause**: Already initialized
- **Action**: Skip init, wallet is usable

### `Wrong password — decryption failed.`
- **Cause**: Wrong password or `WALLET_PASSWORD` set incorrectly
- **Fix**: `unset WALLET_PASSWORD && awp-wallet setup`

### `Invalid or expired session token.`
- **Cause**: Session expired
- **Fix**: `awp-wallet setup`

### `Session token integrity check failed.`
- **Cause**: Security event — session file tampered
- **Fix**: `awp-wallet setup`

### `Unknown chain: "xyz"`
- **Cause**: Unrecognized chain name
- **Fix**: Use valid chain name or `--chain <chainId> --rpc-url <url>`

### `Insufficient balance for transfer + gas.`
- **Cause**: Not enough native token for gas
- **Fix**: Fund wallet with ETH, or set `PIMLICO_API_KEY` for gasless

### `All gas strategies failed.`
- **Cause**: Gasless strategies exhausted
- **Fix**: Verify `PIMLICO_API_KEY` or fund EOA with ETH

## AWP RootNet Errors

### `address_not_registered`
- **Cause**: Wallet not registered on-chain
- **Fix**: Install AWP Skill, run registration

### `cycle detected`
- **Cause**: Circular binding tree
- **Fix**: Redesign binding structure

### `PositionExpired`
- **Cause**: veAWP lock expired
- **Fix**: Withdraw then re-deposit

### `InsufficientBalance`
- **Cause**: Not enough AWP
- **Fix**: Acquire more AWP

### `LockNotExpired`
- **Cause**: Lock period not ended
- **Action**: Wait for lock expiry

## API Errors

### `401 Unauthorized`
- **Cause**: Missing or invalid auth
- **Fix**: Check wallet session, run diagnostics

### `403 Forbidden`
- **Cause**: Insufficient permission
- **Fix**: Check role requirements

### `404 Not Found`
- **Cause**: Resource doesn't exist
- **Action**: Verify ID/address

### `429 Too Many Requests`
- **Cause**: Rate limited
- **Action**: Wait, agent auto-throttles

### `500+` Server Error
- **Action**: Retry with backoff

## WorkNet-Specific Errors

Each WorkNet has its own error codes. See WorkNet documentation:
- Mine WorkNet: `worknets/mine/troubleshooting.md`
