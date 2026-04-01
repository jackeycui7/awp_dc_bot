# DAO Governance

## Overview

AWP uses NFT-based quadratic-style governance. Voting power comes from StakeNFT positions (time-weighted locked AWP). The DAO controls protocol parameters, treasury funds, and emergency operations.

## Voting Power (AWP Power)

Contract formula (integer square root):
```
s × Math.sqrt(min(remainingTime, 54 weeks) / 7 days)
```
where `s` = staked AWP amount, `remainingTime` = seconds until lock expiry

- Locked 7 days → 1× multiplier
- Locked 28 days → 2× multiplier
- Locked 112 days → 4× multiplier
- Locked ≥343 days → **7× maximum** (integer sqrt(54) = 7, contract caps at 54 weeks)
- Sub-linear growth: doubling lock time increases power by only ~41%
- Cap at 54 weeks prevents extreme lock durations from dominating governance

Multiple position NFTs sum: `V_total = Σ V(sᵢ, τᵢ)`

**Anti-manipulation rule**: Only StakeNFT positions created **before** a proposal was submitted can vote on it. You cannot mint a position and immediately vote.

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

The agent handles ABI encoding and StakeNFT token ID lookup automatically.

Check current proposals:
```bash
curl https://tapi.awp.sh/api/governance/proposals
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

## What Governance Controls

Operations requiring Timelock (DAO approval):
- `banSubnet(subnetId)` — ban a misbehaving subnet
- `unbanSubnet(subnetId)` — reinstate a banned subnet
- `deregisterSubnet(subnetId)` — permanently remove (requires Banned + 30-day immunity)
- `emergencySetWeight(epoch, index, addr, weight)` — override oracle emission weights
- `AWPEmission` parameter changes (epoch duration, oracle threshold, etc.)
- Treasury fund disbursements

## Treasury

The DAO Treasury receives **50% of all AWP emissions** every epoch.

Check treasury balance:
```bash
curl https://tapi.awp.sh/api/governance/treasury
```

Treasury funds can only be moved via approved executable governance proposals (after 2-day timelock).

## Governance Security

- **Per-tokenId double-vote prevention**: Each NFT can only vote once per proposal
- **Snapshot at proposal creation**: Only pre-existing positions count
- **2-day timelock**: Gives the community time to react before execution
- **Foundation veto (temporary)**: During the early period, a Foundation Senate with veto power and limited term acts as a safety mechanism before full DAO control
