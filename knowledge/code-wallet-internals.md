# Code: awp-wallet Internals

Source: `/root/awp-wallet/scripts/` (v0.15.1)

## Key Files

| File | Role |
|------|------|
| `wallet-cli.js` | CLI entry point, commander setup, 28 commands |
| `lib/keystore.js` | Key creation, scrypt encryption, signer cache |
| `lib/session.js` | HMAC-signed session tokens, scope enforcement |
| `lib/paths.js` | Wallet directory resolution, multi-agent isolation |
| `lib/chains.js` | Chain registry, RPC resolution, token lookup |
| `lib/tx-router.js` | send/batch/approve/revoke routing logic |
| `lib/direct-tx.js` | EOA transactions via viem WalletClient |
| `lib/gasless-tx.js` | ERC-4337 UserOps via permissionless (Kernel v3) |
| `lib/tx-validator.js` | Amount, address, limit, allowlist validation |
| `lib/tx-logger.js` | SHA-256 hash-chained append-only audit log |
| `lib/signing.js` | EIP-191 / EIP-712 signing |
| `lib/balance.js` | getBalance, portfolio, allowances |
| `lib/bundler.js` | Pimlico/Alchemy/Stackup bundler clients |

## Wallet Directory Layout

```
Profile selection (paths.js):
  AWP_SESSION_ID → wallets/session-id/
  AWP_AGENT_ID   → wallets/agent-id/
  (default)      → wallets/default/

~/.openclaw-wallet/
├── wallets.json              ← registry (atomic write: tmp→rename)
└── wallets/
    └── <profileId>/
        ├── keystore.enc      ← ethers v6 V3 JSON, scrypt N=262144
        ├── meta.json         ← { address, smartAccounts: {chainId: addr} }
        ├── config.json       ← chain registry, limits, bundler config
        ├── .wallet-password  ← auto-managed: 32-byte base64 random
        ├── .session-secret   ← 32-byte hex HMAC key
        ├── tx-log.jsonl      ← hash-chained audit log
        ├── sessions/
        │   └── wlt_<hex>.json
        └── .signer-cache/
            └── <sessionId>.key   ← AES-256-GCM encrypted private key
```

## Unlock / Session Flow

```
awp-wallet unlock --duration 3600 --scope full
  → keystore.js: loadPassword() → try env → try .wallet-password → generate new
  → keystore.js: decryptKeystore(password) → ethers.Wallet.fromEncryptedJson()
      → scrypt N=262144 (slow by design, ~2-3s)
  → keystore.js: writeSignerCache(wallet, sessionId)
      → scrypt N=16384 + random salt → AES-256-GCM encrypt private key
      → write to .signer-cache/<sessionId>.key
  → session.js: createSession(scope, duration)
      → generate token: "wlt_" + 32 random hex bytes
      → HMAC-SHA256 over {id, scope, created, expires} using .session-secret
      → write to sessions/<tokenId>.json
  → output: { sessionToken: "wlt_...", expires: "..." }
```

## Transaction Routing: `send` Command

```
send --token T --to ADDR --amount N --chain X [--asset A] [--mode M]
  → session.js: requireScope(token, "transfer")
  → tx-validator.js: validateTransaction()
      1. amount > 0
      2. isAddress(to)
      3. to !== zero address
      4. to !== self (EOA + smart account)
      5. allowlist check (if enabled)
      6. perTransactionMax check
      7. dailyMax check (reads tx-log.jsonl, 24h rolling)
  → tx-router.js: selectMode(chain, asset)  [unless --mode specified]
      → getBalance(EOA, native)
      → estimate gas cost × 2 buffer
      → if EOA has enough → "direct"
      → if not + bundler key exists → "gasless"
      → else → throw "Insufficient native gas..."
  → direct-tx.js OR gasless-tx.js
  → tx-logger.js: logTransaction() → append to tx-log.jsonl
  → output JSON result
```

## Direct Transaction (direct-tx.js)

```javascript
// Native transfer
walletClient.sendTransaction({ to, value: toWei(amount) })

// ERC-20 transfer
encodeFunctionData(erc20Abi, "transfer", [to, toWei(amount)])
→ walletClient.sendTransaction({ to: tokenContract, data })

// Both wait for 1 confirmation, 120s timeout
await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 })
```

## Gasless Transaction (gasless-tx.js)

```javascript
// Smart account setup (Kernel v3, ERC-4337)
toEcdsaKernelSmartAccount(publicClient, { owner: signer, entryPoint: EP_07 })
// Address auto-saved to meta.json on first use

// Strategy selection (in order):
1. verifying_paymaster  → if chain config says so
2. erc20_paymaster      → if wallet has ≥ 0.01 USDC on chain
3. smart_account        → fallback (user pays from smart account balance)

// Nonce conflict retry: up to 3 times on AA25 error, 2s delay
// Paymaster rejected → try next strategy
// All failed → throw "All gas strategies failed. Last error: ..."
```

## Transaction Validator Key Logic

```javascript
// Daily limit enforcement (24h rolling window)
const since = Date.now() - 86400_000
const entries = readTxLog().filter(e => e.timestamp > since && e.chain === chain)
const dayTotal = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0)
if (dayTotal + amount > dailyLimit) throw new Error(`Daily limit exceeded for ${asset}.`)

// Batch accumulator: batch operations share the same daily budget
// You cannot bypass daily limit by splitting into multiple batch ops
```

## Audit Log (tx-logger.js)

Each entry in `tx-log.jsonl`:
```json
{
  "timestamp": 1712000000000,
  "type": "transfer",
  "status": "sent",
  "mode": "direct",
  "txHash": "0x...",
  "chain": "bsc",
  "to": "0x...",
  "amount": "10",
  "asset": "usdc",
  "_prevHash": "sha256_of_previous_entry",
  "_hash": "sha256(prevHash + JSON.stringify(this_entry_without_hash))"
}
```

Hash chain verification: `awp-wallet verify-log` walks the entire file checking each `_hash`.

## Security: What the Agent Sees vs. What It Doesn't

| Item | Visible to Agent | Where It Lives |
|------|-----------------|----------------|
| Session token (`wlt_...`) | ✅ Yes | sessions/*.json |
| Wallet address | ✅ Yes | meta.json |
| Transaction results | ✅ Yes | returned by CLI |
| Private key | ❌ Never | .signer-cache/*.key (AES-GCM encrypted) |
| Keystore password | ❌ Never | .wallet-password (auto-managed) |
| Mnemonic | ❌ Never | keystore.enc (scrypt encrypted) |

Private keys exist in plaintext only in Node.js process memory during a CLI call, then are destroyed on process exit.
