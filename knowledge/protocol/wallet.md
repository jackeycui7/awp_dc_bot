# AWP Wallet Guide

## What is awp-wallet

`awp-wallet` is a self-custodial EVM wallet designed specifically for AI agents. It exposes 28 commands with JSON output so any agent can consume results programmatically. It supports 400+ EVM chains with 16 preconfigured, and has two transaction modes: direct EOA and gasless ERC-4337.

AWP token contract address is fetched dynamically from the registry — do not hardcode it.

## Installation

The wallet is installed automatically when you install the AWP skill. You don't need to install it separately.

Your AI agent handles all wallet operations: creation, initialization, unlocking, and address management. You should never need to run wallet commands manually.

If you need to check your wallet address, ask your agent:
```
what's my wallet address
```

## Wallet Storage

All wallet data lives in `~/.openclaw-wallet/`:
```
~/.openclaw-wallet/
└── wallets/
    └── default/              ← or AWP_AGENT_ID if set
        ├── keystore.enc      ← encrypted private key (scrypt + AES-128-CTR)
        ├── meta.json         ← address + smart account addresses
        ├── config.json       ← chain config, limits, bundler settings
        ├── .wallet-password  ← auto-managed 32-byte random password
        ├── .session-secret   ← HMAC key for session tokens
        ├── tx-log.jsonl      ← hash-chained audit log of all transactions
        └── sessions/         ← active session token files
```

**Security**: Private keys are encrypted with scrypt N=262144. Keys are never exposed to the agent — the agent only sees session tokens (`wlt_...`).

## Password System

Three modes (in priority order):
1. `WALLET_PASSWORD` env var — explicit mode (required for export)
2. `~/.openclaw-wallet/wallets/<id>/.wallet-password` — **auto-managed** (default, recommended)
3. First run — auto-generates and saves a random 32-byte password

**Recommendation**: Don't set `WALLET_PASSWORD` unless you have a specific reason. Let auto-managed mode handle it.

## Session Tokens

Your agent manages session tokens automatically. You don't need to manually unlock or lock the wallet.

**How it works internally** (for reference):
- The agent calls `awp-wallet unlock` to get a session token
- Session tokens have scoped permissions: `read`, `transfer`, or `full`
- WorkNet workers auto-refresh tokens periodically
- Sessions expire automatically

## Multi-Agent Isolation

Your agent handles this automatically. If you need to run multiple agents, each gets its own wallet via the `AWP_AGENT_ID` environment variable — your agent sets this up when needed.

## All 28 Commands

### Wallet Management
| Command | Auth | Description |
|---------|------|-------------|
| `init` | None | Create new wallet with random key |
| `import --mnemonic "..."` | None | Import from BIP-39 seed phrase |
| `unlock --duration N --scope S` | None | Get session token |
| `lock` | None | Revoke all sessions, wipe key cache |
| `change-password` | None | Re-encrypt keystore (needs `NEW_WALLET_PASSWORD` env) |
| `export` | None | Export mnemonic (needs explicit `WALLET_PASSWORD`) |
| `wallet-id` | None | Show current profile ID and directory |
| `wallets` | None | List all wallet profiles |

### Query (Read-Only)
| Command | Auth | Description |
|---------|------|-------------|
| `receive [--chain X]` | None | Show EOA + smart account addresses |
| `balance --token T --chain X [--asset A]` | read | EOA + smart account balances |
| `portfolio --token T` | read | Balances across all configured chains |
| `allowances --token T --asset A --spender S --chain X` | read | ERC-20 allowance |
| `history --token T [--chain X] [--limit N]` | read | Transaction log (default 50 entries) |
| `status --token T` | read | Validate session, show address + expiry |
| `verify-log` | None | Verify SHA-256 hash-chain integrity of tx-log |
| `tx-status --hash H --chain X` | None | Check on-chain receipt |
| `chain-info --chain X` | None | Chain details + gasless availability |
| `chains` | None | List all configured chains |
| `estimate --to A --amount N --chain X [--asset A]` | None | Gas cost estimate |

### Transactions
| Command | Auth | Description |
|---------|------|-------------|
| `send --token T --to A --amount N --chain X [--asset A] [--mode M]` | transfer | Send native or ERC-20 |
| `batch --token T --ops '[...]' --chain X` | transfer | Send multiple ops atomically |
| `approve --token T --asset A --spender S --amount N --chain X` | transfer | ERC-20 approve |
| `revoke --token T --asset A --spender S --chain X` | transfer | ERC-20 revoke (approve 0) |

### Signing
| Command | Auth | Description |
|---------|------|-------------|
| `sign-message --token T --message M` | full | EIP-191 personal signature |
| `sign-typed-data --token T --data JSON` | full | EIP-712 typed data signature |

### Smart Account (ERC-4337 / EIP-7702)
| Command | Auth | Description |
|---------|------|-------------|
| `upgrade-7702 --token T --chain X` | full | Upgrade EOA to Kernel v3 smart account |
| `revoke-7702 --token T --chain X` | full | Revoke EIP-7702 delegation |
| `deploy-4337 --token T --chain X` | full | Check/deploy smart account (auto on first gasless tx) |

## Transaction Modes

**Direct (EOA)**: Requires native token for gas. Fastest.
```bash
awp-wallet send --token $TOKEN --to 0x... --amount 10 --asset usdc --chain bsc --mode direct
```

**Gasless (ERC-4337)**: Requires `PIMLICO_API_KEY`. Zero native token needed.
```bash
export PIMLICO_API_KEY=pk_...
awp-wallet send --token $TOKEN --to 0x... --amount 10 --asset usdc --chain bsc --mode gasless
```

**Auto (default)**: Tries direct if enough gas, falls back to gasless if key is configured.

## Supported Chains

16 preconfigured: `ethereum`, `base`, `arbitrum`, `optimism`, `polygon`, `bsc`, `avalanche`, `fantom`, `zksync`, `linea`, `scroll`, `mantle`, `blast`, `celo`, `sepolia`, `base-sepolia`

For custom chains: `--chain <chainId> --rpc-url <rpc_endpoint>`

## Transaction Limits (Default Config)

| Asset | Per-Transaction Max | Daily Max (24h rolling) |
|-------|--------------------|-----------------------|
| USDC / USDT | 500 | 1,000 |
| DAI | — | 1,000 |
| ETH | 0.25 | 0.5 |
| BNB | — | 1.0 |
| Default | 250 | 500 |

To increase limits: edit `~/.openclaw-wallet/wallets/<id>/config.json`

## Security Principles

- **Private key never in agent context** — agent only sees `wlt_...` session tokens
- **Auto-managed wallet** — do not store large personal funds; only minimal gas + working amounts
- **Audit log** — every transaction is SHA-256 hash-chained in `tx-log.jsonl`; run `awp-wallet verify-log` to check integrity
- **Process isolation** — keys are in memory only during the CLI call, destroyed on exit
