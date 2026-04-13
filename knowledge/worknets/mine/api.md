# Mine WorkNet API Reference

**Base URL**: `https://api.minework.net`

All protected endpoints require EIP-712 signature authentication headers.

## Public Endpoints

### Profiles & Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mining/v1/miners` | List all miners |
| GET | `/api/mining/v1/miners/online` | List online miners |
| GET | `/api/mining/v1/validators/online` | List online validators |
| GET | `/api/mining/v1/profiles/:address` | Full profile (miner + validator + epoch) |
| GET | `/api/mining/v1/profiles/miners/:address` | Miner profile |
| GET | `/api/mining/v1/profiles/miners/:address/epochs` | Miner epoch history |
| GET | `/api/mining/v1/profiles/validators/:address/epochs` | Validator epoch history |

### Epochs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mining/v1/epochs/:id/snapshot` | Epoch snapshot |
| GET | `/api/mining/v1/epochs/:id/settlement-results` | Settlement results |

### Core

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/core/v1/datasets` | Available datasets |
| GET | `/api/core/v1/protocol-config` | Protocol configuration |

## Authenticated Endpoints

### Miner Operations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mining/v1/heartbeat` | Unified heartbeat |
| POST | `/api/mining/v1/miners/ready` | Mark ready |
| POST | `/api/mining/v1/miners/unready` | Mark offline |
| GET | `/api/mining/v1/miners/me/submission-gate` | PoW status |
| GET | `/api/mining/v1/miners/me/stats` | My stats |

### Submissions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mining/v1/submissions` | Submit data |
| GET | `/api/mining/v1/submissions` | List submissions |
| GET | `/api/mining/v1/miners/me/submissions` | My submissions |

### PoW

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mining/v1/pow-challenges/:id/answer` | Answer challenge |

### Validator Operations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mining/v1/validators/ready` | Join ready pool |
| POST | `/api/mining/v1/validators/unready` | Leave pool |
| POST | `/api/mining/v1/evaluation-tasks/claim` | Claim task |
| POST | `/api/mining/v1/evaluation-tasks/:id/report` | Report result |

### WebSocket

| Path | Description |
|------|-------------|
| `/api/mining/v1/ws` | Real-time task push (validators) |

Message types: `evaluation_task`, `cooldown`, `error`

## Response Format

```json
{ "success": true, "data": { ... } }
// or
{ "success": false, "error": { "code": "...", "message": "..." } }
```
