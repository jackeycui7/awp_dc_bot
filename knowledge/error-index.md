# Error Index — AWP Complete Error Reference

All known error messages, trigger conditions, and solutions. Grouped by module.

---

## awp-wallet Errors

### `No wallet found. Run 'init' first.`
- **Source**: `scripts/lib/keystore.js`
- **Trigger**: `~/.openclaw-wallet/wallets/<id>/keystore.enc` does not exist
- **Cause**: Wallet was never initialized, or wrong `AWP_AGENT_ID` / `AWP_SESSION_ID` is set
- **Fix**:
  ```bash
  awp-wallet init
  # For multi-agent setups, verify AWP_AGENT_ID is correct:
  awp-wallet wallets   # list all existing wallet profiles
  ```

### `Wallet already exists.`
- **Source**: `scripts/lib/keystore.js`
- **Trigger**: Running `awp-wallet init` when a wallet already exists in that profile directory
- **Cause**: Already initialized — this is not an error, just a guard
- **Fix**: Skip init. The existing wallet is usable. To reinitialize, back up first.

### `Wrong password — decryption failed.`
- **Source**: `scripts/lib/keystore.js`
- **Trigger**: `WALLET_PASSWORD` env var does not match the password used during encryption
- **Cause**: Wrong password set, or `WALLET_PASSWORD` was accidentally set in auto-managed mode
- **Fix**:
  ```bash
  # In auto-managed mode, do NOT set WALLET_PASSWORD — let the wallet manage it
  unset WALLET_PASSWORD
  awp-wallet unlock --duration 3600
  ```

### `Invalid or expired session token.`
- **Source**: `scripts/lib/session.js`
- **Trigger**: Session token is expired, file was deleted, or token format is invalid
- **Cause**: Previous unlock session timed out based on `--duration` setting
- **Fix**:
  ```bash
  awp-wallet unlock --duration 3600 --scope full
  ```

### `Session token integrity check failed.`
- **Source**: `scripts/lib/session.js`
- **Trigger**: A file in `sessions/` directory was externally modified
- **Cause**: Security event — session file tampered with
- **Fix**:
  ```bash
  awp-wallet lock    # wipe all sessions and cache
  awp-wallet unlock --duration 3600
  ```

### `Session secret not found. Run 'awp-wallet init' first.`
- **Source**: `scripts/lib/session.js`
- **Trigger**: `.session-secret` file is missing
- **Cause**: Wallet directory is incomplete — some files were deleted
- **Fix**: Re-run `awp-wallet init`. If it says wallet already exists, manually check `~/.openclaw-wallet/wallets/<id>/` for missing files.

### `Scope 'read' insufficient; 'transfer' required.`
- **Source**: `scripts/lib/session.js`
- **Trigger**: Using a low-privilege token for an operation that requires higher scope
- **Cause**: Unlocked with `--scope read` but operation needs `transfer` or `full`
- **Fix**:
  ```bash
  awp-wallet unlock --duration 3600 --scope full
  ```

### `Config not found. Run 'awp-wallet init' first.`
- **Source**: `scripts/lib/chains.js`
- **Trigger**: `config.json` file does not exist
- **Cause**: Wallet initialization was incomplete, or config file was deleted
- **Fix**: `awp-wallet init`

### `Config file corrupted. Delete and re-run 'awp-wallet init'.`
- **Source**: `scripts/lib/chains.js`
- **Trigger**: `config.json` exists but contains invalid JSON
- **Fix**:
  ```bash
  rm ~/.openclaw-wallet/wallets/default/config.json
  awp-wallet init
  ```

### `Unknown chain: "xyz". Use --chain <name|id> or --rpc-url.`
- **Source**: `scripts/lib/chains.js`
- **Trigger**: `--chain` flag uses an unrecognized chain name or ID
- **Supported chain names**: `ethereum`, `base`, `arbitrum`, `optimism`, `polygon`, `bsc`, `avalanche`, `fantom`, `zksync`, `linea`, `scroll`, `mantle`, `blast`, `celo`, `sepolia`, `base-sepolia`
- **Fix**: Use a valid chain name, or `--chain <chainId> --rpc-url <rpc>` for custom chains

### `Token "XYZ" not configured for chain "...". Use contract address: --asset 0x...`
- **Source**: `scripts/lib/chains.js`
- **Trigger**: `--asset` uses a token symbol not configured for that chain
- **Fix**: Use the contract address directly: `--asset 0x<contract_address>`

### `Insufficient balance for transfer + gas.`
- **Source**: `scripts/lib/direct-tx.js`
- **Trigger**: EOA native token balance is too low to cover the transfer amount plus gas
- **Fix**: Fund the wallet address with native token (BNB on BSC, gas costs ~$0.01), or set up `PIMLICO_API_KEY` for gasless mode

### `Insufficient native gas for direct transaction ... and no bundler API key configured for gasless mode.`
- **Source**: `scripts/lib/tx-router.js`
- **Trigger**: Not enough gas for direct tx, and no Pimlico/Alchemy/Stackup API key configured
- **Fix** (pick one):
  1. Send BNB to the wallet address (BSC gas is ~$0.01/tx)
  2. `export PIMLICO_API_KEY=<key>` to enable gasless mode

### `All gas strategies failed. Last error: ...`
- **Source**: `scripts/lib/gasless-tx.js`
- **Trigger**: All three paymaster strategies (verifying / erc20 / smart_account) failed
- **Cause**: Invalid Pimlico API key, or insufficient balance for paymaster fees
- **Fix**: Verify `PIMLICO_API_KEY` is valid, or fund the EOA with BNB to use direct mode

### `No bundler API key set.`
- **Source**: `scripts/lib/bundler.js`
- **Trigger**: Forced `--mode gasless` but no bundler API key is configured
- **Fix**: `export PIMLICO_API_KEY=<key>`

### `Invalid Ethereum address: 0x...`
- **Source**: `scripts/lib/tx-validator.js`
- **Trigger**: `--to` value is not a valid 40-hex-char Ethereum address
- **Fix**: Check address format — must be `0x` followed by exactly 40 hex characters

### `Cannot send to zero address.`
- **Source**: `scripts/lib/tx-validator.js`
- **Trigger**: `--to 0x0000000000000000000000000000000000000000`
- **Fix**: Use a real recipient address

### `Cannot send to own address.` / `Cannot send to own Smart Account address.`
- **Source**: `scripts/lib/tx-validator.js`
- **Trigger**: Attempting to transfer to your own EOA or smart account address
- **Fix**: Use a different recipient address

### `Recipient 0x... not in allowlist.`
- **Source**: `scripts/lib/tx-validator.js`
- **Trigger**: `allowlistMode: true` in config but the destination address is not in `allowlistedRecipients`
- **Fix**: Add the address to `allowlistedRecipients` in `config.json`, or disable allowlist mode

### `Per-transaction limit exceeded: X > Y`
- **Source**: `scripts/lib/tx-validator.js`
- **Trigger**: Single transfer exceeds `perTransactionMax` in config
- **Defaults**: USDC/USDT: 500, ETH: 0.25, others: 250
- **Fix**: Split the transfer into smaller amounts, or increase `perTransactionMax` in `config.json`

### `Daily limit exceeded for USDC.`
- **Source**: `scripts/lib/tx-validator.js`
- **Trigger**: 24-hour rolling cumulative transfers exceeded the daily cap
- **Defaults**: USDC/USDT/DAI: 1000, ETH: 0.5, BNB: 1.0, others: 500
- **Fix**: Wait for the 24-hour window to reset, or increase `dailyMax` in `config.json`

### `Raw call type not allowed in batch.`
- **Source**: `scripts/lib/tx-validator.js`
- **Trigger**: `batch --ops` array contains an operation with `"type":"raw"`
- **Fix**: Remove raw-type operations. Batch only supports `transfer`, `approve`, `revoke`

### `WALLET_PASSWORD required for export. Auto-managed wallets cannot export seed phrases for security.`
- **Source**: `scripts/lib/keystore.js`
- **Trigger**: Running `awp-wallet export` in auto-managed password mode
- **Cause**: Security restriction — auto-managed wallets do not expose the seed phrase
- **Fix**: If export is truly needed, re-initialize with `--password` flag to use explicit password mode (note: this requires wallet migration)

### `NEW_WALLET_PASSWORD environment variable required.`
- **Source**: `scripts/lib/keystore.js`
- **Trigger**: Running `awp-wallet change-password` without setting the new password env var
- **Fix**: `export NEW_WALLET_PASSWORD=<newpassword> && awp-wallet change-password`

### `Wallet metadata corrupted. Re-import with 'import --mnemonic'.`
- **Source**: `scripts/lib/keystore.js`
- **Trigger**: `meta.json` exists but contains invalid JSON
- **Fix**: `awp-wallet import --mnemonic "your twelve word seed phrase here"`

### `Invalid wallet ID: "...". Only alphanumeric, hyphen, underscore allowed.`
- **Source**: `scripts/lib/paths.js`
- **Trigger**: `AWP_AGENT_ID` or `AWP_SESSION_ID` contains illegal characters
- **Fix**: Use only letters, digits, hyphens, and underscores

### `--duration must be a positive integer (seconds).`
- **Source**: `scripts/wallet-cli.js`
- **Trigger**: `awp-wallet unlock --duration abc` or a negative number
- **Fix**: `awp-wallet unlock --duration 3600`

### `--ops must be a non-empty JSON array of operations.`
- **Source**: `scripts/wallet-cli.js`
- **Trigger**: `awp-wallet batch --ops ""` or a non-array JSON value
- **Fix**: `--ops '[{"to":"0x...","amount":"1","asset":"usdc"}]'`

---

## benchmark-worker.py Errors

### `Wallet not initialized. Please run awp-wallet init and unlock first.`
- **Source**: `benchmark-worker.py` startup check in `main()`
- **Trigger**: `get_wallet_address()` returns None — wallet address cannot be detected
- **Cause**: awp-wallet not installed, or `awp-wallet receive` returns empty output
- **Fix**:
  ```bash
  awp-wallet receive       # should print your address
  awp-wallet init          # run this if receive returns nothing
  ```

### `Failed to unlock wallet. Please run awp-wallet unlock --duration 3600.`
- **Source**: `benchmark-worker.py` startup check in `main()`
- **Trigger**: `unlock_wallet()` returns False — `awp-wallet unlock` exits non-zero
- **Cause**: Wrong password, corrupted wallet files, or broken awp-wallet installation
- **Fix**:
  ```bash
  awp-wallet unlock --duration 3600 --scope full 2>&1   # see the actual error
  ```

### `Not registered on AWP RootNet. Please register via AWP skill first.`
- **Source**: `benchmark-worker.py` startup check and main loop
- **Trigger**: Poll API response body contains "not registered"
- **Cause**: The current wallet address is not registered on AWP RootNet
- **Fix**: Install awp-skill and complete the registration flow (free, requires zero ETH/AWP):
  ```
  skill install https://github.com/awp-core/awp-skill
  # Then say: "start working"
  ```

### `[WAIT] suspended, retry in 60s`
- **Source**: `benchmark-worker.py` main loop
- **Trigger**: Poll API response contains "suspended"
- **Cause**: Worker was suspended due to policy violation or low score. Suspension duration starts at 10 min and doubles with each violation within an epoch.
- **Action**: Worker auto-waits and retries. No manual intervention needed. Suspension lifts automatically.

### `[NET] invalid response, retry in 10s`
- **Source**: `benchmark-worker.py` main loop
- **Trigger**: Poll API returns a response that cannot be parsed as JSON
- **Cause**: Network instability or temporary API server issue
- **Action**: Worker auto-retries every 10 seconds. Usually self-resolving.

### `[SIGN] exit X: ...` / `sign request timeout`
- **Source**: `benchmark-worker.py` `signed_request()`
- **Trigger**: `benchmark-sign.sh` exits with non-zero code or times out
- **Cause**: Session token expired, or `awp-wallet sign-message` failed
- **Action**: Worker automatically clears `AWP_SESSION_TOKEN` and re-unlocks on the next request. Usually self-resolving.

### `[SIGN] benchmark-sign.sh not found`
- **Source**: `benchmark-worker.py`
- **Trigger**: `benchmark-sign.sh` script is missing or not executable
- **Cause**: Incomplete skill installation
- **Fix**:
  ```bash
  skill install https://github.com/awp-core/s1-benchmark-skill
  ```

### `[SETUP] openclaw not found in PATH or common locations`
- **Source**: `benchmark-worker.py` `_resolve_openclaw_path()`
- **Trigger**: Worker cannot locate the `openclaw` binary in PATH or any of 10+ known locations
- **Cause**: openclaw not installed, or not in PATH
- **Fix**:
  ```bash
  npm install -g openclaw
  export PATH="$(npm bin -g):$PATH"
  ```

### `[AGENT] CLI timeout (150s)`
- **Source**: `benchmark-worker.py` `_call_agent()`
- **Trigger**: openclaw agent call does not return within the timeout (default 150s, configurable)
- **Cause**: AI model responding too slowly, or API rate limiting
- **Action**: For answer tasks — worker automatically submits `"unknown"` (scores 3 pts instead of 0). For ask tasks — skipped entirely (no bad questions submitted). To increase timeout, edit the runtime config file:
  ```bash
  # Edit /tmp/benchmark-worker-<id>-config.json
  {"cli_timeout": 200}
  ```

### `[AGENT] Anthropic rate limit detected, backing off 60s`
- **Source**: `benchmark-worker.py` `_call_agent()`
- **Trigger**: openclaw CLI output contains "429", "rate", or "Extra usage"
- **Action**: Worker automatically backs off 60 seconds. No manual intervention needed.

### `[CRASH] exceeded 5 restarts, giving up`
- **Source**: `benchmark-worker.py` main()
- **Trigger**: Worker crashed and auto-restarted more than 5 consecutive times (10s cooldown each)
- **Cause**: A persistent error that bypassed startup checks
- **Fix**:
  ```bash
  # Check logs for root cause
  tail -50 /tmp/benchmark-worker-*.log
  cat /tmp/benchmark-worker-*-status.json
  # Manually restart via agent
  openclaw agent --agent benchmark-worker-<id> --message "restart"
  ```

### `[ALERT] X consecutive fallbacks`
- **Source**: `benchmark-worker.py` answer flow
- **Trigger**: 5+ consecutive answer submissions were `"unknown"` fallbacks
- **Cause**: openclaw agent CLI is consistently failing
- **Fix**: Check openclaw is running normally, verify AI API key is valid and has quota, check network connectivity

### `[ASK] failed to fetch benchmark sets`
- **Source**: `benchmark-worker.py` `_handle_ask()`
- **Trigger**: `GET /api/v1/benchmark-sets` request failed
- **Action**: Skip this ask cycle, retry next iteration automatically

### `[UPDATE] git pull failed: ...`
- **Source**: `benchmark-worker.py` auto-update check (runs hourly)
- **Cause**: Not a git repository (installed via other method), or network issue
- **Fix**:
  ```bash
  openclaw agent --agent benchmark-worker-<id> --message "update"
  ```

---

## Benchmark API Errors (subnet-benchmark server)

These appear as `{"ok": false, "error": "..."}` in API responses.

### `"benchmark set not found or inactive"` (code: `invalid_bs`)
- **Trigger**: The `bs_id` in a question submission does not exist or is inactive
- **Fix**:
  ```bash
  curl https://tapis1.awp.sh/api/v1/benchmark-sets   # list available sets
  ```

### `"too many questions, please wait"` (code: `rate_limited`)
- **Trigger**: More than 1 question submitted per minute per worker
- **Action**: Worker handles this automatically (1/min rate). For manual submissions, wait 60 seconds.

### `"question too similar to an existing one"` (code: `duplicate`)
- **Trigger**: Submitted question has MinHash Jaccard similarity ≥ 0.85 with an existing question in the same benchmark set
- **Cause**: Agent generated a duplicate or near-duplicate question
- **Action**: Worker skips and generates a new question next cycle automatically

### `"field_too_long"` (code: `field_too_long`)
- **Trigger**: `question` or `answer` text exceeds the max length for the benchmark set
- **Action**: Worker skips and retries with a shorter question next cycle

### `"not found"` (HTTP 404)
- **Trigger**: Querying a non-existent worker address, question ID, or epoch date
- **Cause**: Typo in address, or the data does not exist yet

### Answer submitted with `score=0` (timeout)
- **Trigger**: Answer was submitted after the `reply_ddl` deadline (3 minutes from assignment)
- **Cause**: Agent processing too slow or severe network delay
- **Note**: Worker is designed to submit at least 15 seconds before deadline. Consistent timeouts suggest the AI model is too slow — try reducing `cli_timeout` to force earlier fallback submission.

---

## AWP RootNet / awp-skill Errors

### `[!] awp-wallet not found`
- **Trigger**: awp-skill load-time check cannot find `awp-wallet` in PATH
- **Fix**:
  ```bash
  skill install https://github.com/awp-core/awp-wallet
  # or manually:
  git clone https://github.com/awp-core/awp-wallet && cd awp-wallet && bash install.sh
  ```

### `[!] not registered. say "start working"`
- **Trigger**: Daemon status check finds the current wallet is unregistered
- **Fix**: Type `start working` in the agent to trigger the registration flow

### `[!] re-unlocking wallet...`
- **Trigger**: Session token expired; daemon automatically re-unlocks
- **Action**: Fully automatic, no intervention needed

### `[!] insufficient balance`
- **Trigger**: Attempting deposit or allocation with insufficient AWP balance
- **Fix**: Acquire AWP tokens first (testnet: use faucet; mainnet: purchase via PancakeSwap on BSC)

### `PositionExpired` (contract revert)
- **Trigger**: Calling `addToPosition` on a StakeNFT whose lock period has expired
- **Fix**: Withdraw first, then create a new deposit:
  ```bash
  # Run onchain-withdraw.py for the expired token ID, then onchain-deposit.py
  ```

### `cycle detected` (HTTP 400 from relay)
- **Trigger**: `bind(target)` would create a circular binding tree (e.g., A→B→A)
- **Fix**: Redesign the binding tree — circular bindings are not allowed

### `Cannot activate: subnet is Active (must be Pending)`
- **Trigger**: Trying to activate a subnet that is already in Active state
- **Fix**: Check current subnet status first: `awp subnets` or `GET /api/subnets/<id>`

### `[!] rate limited. retrying in 60s...`
- **Trigger**: Gasless relay exceeded 100 requests/IP/hour
- **Action**: Auto-retries after 60 seconds

---

## General Environment Errors

### `awp-wallet: command not found`
- **Cause**: Installation failed, or `~/.local/bin` is not in PATH
- **Fix**:
  ```bash
  export PATH="$HOME/.local/bin:$PATH"
  source ~/.bashrc    # or ~/.zshrc
  awp-wallet receive  # test
  ```

### `openclaw: command not found`
- **Cause**: openclaw not installed, or npm global bin directory not in PATH
- **Fix**:
  ```bash
  npm install -g openclaw
  export PATH="$(npm bin -g):$PATH"
  ```

### `python3: command not found`
- **Cause**: Python 3 not installed
- **Fix**: Install Python 3.9+ via system package manager (`apt install python3`, `brew install python3`, etc.)

### `ModuleNotFoundError: No module named 'xxx'`
- **Cause**: All AWP Python scripts (benchmark-worker.py, awp-skill scripts) use only the standard library — no pip dependencies. This error indicates Python version is too old (< 3.9), or a system Python is being used that's missing standard modules.
- **Fix**: Upgrade to Python 3.9 or later
