# DAO Governance

## Overview

AWP uses NFT-based quadratic-style governance. Voting power comes from veAWP positions (time-weighted locked AWP). The DAO controls protocol parameters, treasury funds, and emergency operations.

## Voting Power (AWP Power)

Formula: `V(s, τ) = s × min(√(τ/7), 8)` where τ = remaining lock duration in days

- Locked 7 days → 1× multiplier
- Locked 28 days → 2× multiplier
- Locked 112 days → 4× multiplier
- Locked ≥448 days → **8× maximum** (√(448/7) = √64 = 8)
- Sub-linear growth: doubling lock time increases power by only ~41%

Multiple position NFTs sum: `V_total = Σ V(sᵢ, τᵢ)`

**Anti-manipulation rule**: Only veAWP positions created **before** a proposal was submitted can vote on it. You cannot mint a position and immediately vote.

## Two Proposal Types

### Signal Proposals
- Vote only — no on-chain execution
- Express sentiment or gather community consensus
- No timelock delay
- Created with `signalPropose(description, tokenIds)`

### Executable Proposals
- Executes code after voting passes (treasury calls, parameter changes, ban/unban subnets)
- Goes through 2-day Timelock before execution
- Created with `proposeWithTokens(targets, values, calldatas, description, tokenIds)`

## Creating a Proposal

**Requirement**: At least **1,000,000 AWP worth of voting power** to create a proposal.

Via the AWP skill:
```
# Ask your agent to create a governance proposal
# Provide: description, target contracts, calldata (for executable proposals)
```

Tell your agent:
```
vote for proposal <id>
```
or
```
vote against proposal <id> because <reason>
```

The agent handles ABI encoding and veAWP token ID lookup automatically.

Check current proposals:
```bash
curl https://api.awp.sh/api/governance/proposals
```

## Proposal Lifecycle

```
Created → Voting Period → [Passed/Failed]
                              ↓ (if Passed + Executable)
                          Queued in Timelock (2-day delay)
                              ↓
                          Executed
```

Voting parameters (adjustable via governance):
- Voting delay: blocks before voting starts
- Voting period: blocks for voting window
- Quorum: percentage of total voting power required

## Dual-Scope Governance

AWP governance operates at two distinct scopes:

| Scope | What it covers | Who votes |
|-------|---------------|-----------|
| **Global (cross-chain)** | Emission allocation weights for WorkNets | All stakers across all chains, AWP Power aggregated globally, 7-day cycle |
| **Per-chain** | Treasury spending, protocol parameters, WorkNet bans | Only that chain's stakers; 7-day vote + 48-hour timelock |

Each chain runs an independent DAO contract governing its own treasury. Treasury size is proportional to the WorkNet ecosystem strength on that chain — chains with more productive WorkNets accumulate more governance resources.

## What Governance Controls

**Global scope** (cross-chain voting):
- Emission allocation weights — governance weights for each WorkNet, updated on a 7-day cycle

**Per-chain scope** (local chain stakers only):
- `banSubnet(subnetId)` — ban a misbehaving WorkNet
- `unbanSubnet(subnetId)` — reinstate a banned WorkNet
- `deregisterSubnet(subnetId)` — permanently remove (requires Banned + 30-day immunity)
- `emergencySetWeight(epoch, index, addr, weight)` — override oracle emission weights
- `AWP Emission` parameter changes (epoch duration, staking lock bounds, WorkNet immunity period, initial work token pricing)
- Treasury fund disbursements

## Treasury

The DAO Treasury receives **50% of all AWP emissions** every epoch.

Check treasury balance:
```bash
curl https://api.awp.sh/api/governance/treasury
```

Treasury funds can only be moved via approved executable governance proposals (after 2-day timelock).

## Governance Security

- **Per-tokenId double-vote prevention**: Each NFT can only vote once per proposal
- **Snapshot at proposal creation**: Only pre-existing positions count
- **2-day timelock**: Gives the community time to react before execution
- **Guardian**: An emergency mechanism that can pause the protocol but cannot unpause it — only the timelock can resume. Prevents damage without granting unilateral control.
