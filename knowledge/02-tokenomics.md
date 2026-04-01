# AWP Tokenomics

## AWP Token Basics

| Property | Value |
|----------|-------|
| Chain | BSC (BNB Smart Chain), Chain ID 56 |
| Contract | `0x0000969dDC625E1c084ECE9079055Fbc50F400a1` |
| Max Supply | 10,000,000,000 AWP (10 billion, fixed forever) |
| Pre-mint | 200,000,000 AWP (2%) — transferred to Treasury + LP at launch |
| Standard | ERC20 + ERC20Permit + ERC1363 |
| DEX | PancakeSwap V4 on BSC |

## Supply Distribution

- **50%** → Subnet workers (AI agents that perform tasks)
- **50%** → DAO Treasury (governance-controlled)

No team allocation. No VC allocation. No advisor allocation.

## Emission Schedule

AWP uses **continuous exponential decay** — emissions start high and decrease slightly every day, forever.

- **Total daily emission Day 1**: 31,600,000 AWP/day
- **Miner share (WorkNets)**: 15,800,000 AWP/day (50%)
- **DAO Treasury share**: 15,800,000 AWP/day (50%)
- **Decay factor**: 0.996844 per epoch (~0.3156% decrease per day)
- **Epoch duration**: 1 day (86,400 seconds)
- Each day's total emission = previous day × 0.996844

Formula: `E(t) = 2E₀ · e^(-λt)` where E₀ = 15.8M AWP/day, λ = 3.16×10⁻³ day⁻¹

Emission milestones (total daily):

| Time | Daily Total | Cumulative | % of Supply |
|------|------------|------------|-------------|
| Day 1 | 31.6M | 31.6M | 0.3% |
| Day 30 | 28.7M | 904M | 9.0% |
| Day 90 | 23.8M | 2.48B | 24.8% |
| Day 180 | 17.9M | 4.34B | 43.4% |
| Year 1 | 10.0M | 6.84B | 68.4% |
| Year 4 | 0.32M | 9.90B | 99.0% |

This means early participants earn significantly more. 99% of all AWP is released within 4 years.

Emission split per epoch:
- **50%** → WorkNet workers, distributed proportionally to governance weights
- **50%** → DAO Treasury (minted directly)

## Initial Launch Parameters

- Initial FDV: ~$1M USD
- Initial LP: ~$300K USD
- All LP permanently locked in the LPManager contract — cannot be withdrawn

## Anti-Dump Mechanism (30/70/14)

When workers claim rewards:
- **30%** available instantly
- **70%** vested linearly over **14 days**

This prevents large sell pressure immediately after epoch settlement.

## Alpha Tokens (Per-Subnet Tokens)

Every subnet has its own independent Alpha token:
- Max supply: 10,000,000,000 per subnet
- Deployed via CREATE2 (deterministic address)
- Initial liquidity: 100M Alpha at 0.01 AWP each (costs 1M AWP to create a subnet LP)
- Tradeable on PancakeSwap V4
- Minted to workers when they claim epoch rewards from that subnet
- Time-based mint cap after subnet lock: prevents dump attacks

Alpha tokens represent participation in a specific subnet's economy. They are separate from AWP.

## Staking and Voting Power (AWP Power)

AWP holders can lock tokens in StakeNFT positions to:
1. Allocate stake to agents/WorkNets (boosts their emission share)
2. Participate in DAO governance

**Voting power formula** (AWP Power, from deployed contract):

`s × Math.sqrt(min(remainingTime, 54 weeks) / 7 days)` — integer square root

- Locked 7 days → 1× multiplier
- Locked 28 days → 2× multiplier
- Locked 112 days → 4× multiplier
- Locked ≥343 days (49 weeks) → **7× maximum** (integer sqrt(54) = 7)
- Cap: 54 weeks (378 days) — any lock beyond this gives the same 7×
- Sub-linear: doubling lock time increases power by only ~41%

## How Rewards Flow

```
AWPEmission contract
  → Oracle submits agent/subnet weights each epoch
  → settleEpoch() mints AWP proportionally
  → 50% to SubnetManagers (distributed to workers via Merkle proof)
  → 50% to DAO Treasury
```

Workers claim rewards by submitting a Merkle proof on-chain to their subnet's SubnetManager contract.

## Key Constants

| Constant | Value |
|----------|-------|
| Max active subnets | 10,000 |
| Subnet LP creation cost | 1,000,000 AWP |
| Min lock duration | 1 day |
| Max voting weight lock | 54 weeks / 378 days (7× cap) |
| DAO timelock delay | 2 days |
| Epoch duration | 86,400 seconds (1 day) |
