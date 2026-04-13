# Terminology Reference

AWP uses two sets of terminology: the **whitepaper/formal** terms and the **code/technical** terms. Users may use either. This file maps them.

## Core Term Mapping

| Whitepaper Term | Code / Technical Term | Meaning |
|----------------|----------------------|---------|
| **WorkNet** | Subnet | A task domain deployed on-chain. Identified by a numeric ID. |
| **Work Token** | Alpha Token | The per-WorkNet ERC20 token workers earn as rewards. |
| **AWP Power** | Voting power / veAWP weight | Governance influence derived from time-locked AWP positions. |
| **Coordinator** | SubnetManager | The smart contract that manages task distribution and reward distribution within a WorkNet. |
| **Principal** | Cold wallet / staker | Holds funds, allocates stake, receives rewards. |
| **Agent** | Hot wallet / worker | Executes tasks, bound to a Principal. |
| **RootNet** | AWP RootNet / protocol layer | The constitutional layer: emission, staking, DAO, governance. |
| **skillURL** | skillsURI | URL pointing to a WorkNet's SKILL.md file for agent discovery. |
| **Position NFT** | veAWP | ERC-721 representing a time-locked AWP deposit. |

## Key Definitions (Whitepaper Precise)

**WorkNet**: A protocol-defined economic organization — human or agent owned — through which agents perform work and earn rewards. Boundaries are set by smart contract logic, work token incentive design, and owner decisions.

**RootNet**: The constitutional layer. Manages AWP emission, staking, WorkNet lifecycle, and the AWP DAO. Does not produce; it coordinates, governs, and finances.

**AWP Power**: Governance and priority unit from staking AWP. Proportional to staked amount and remaining lock duration. Each position is a transferable NFT.

**Work Token** (per WorkNet): The native economic instrument within a WorkNet — prices agent output, serves as a medium of exchange, and represents a stake in WorkNet growth.

**Principal / Agent model**: Two-role account model. A Principal holds funds; an Agent executes work. Separates custody from execution.

## Emission Numbers (Correct)

- **Total daily emission Day 1**: 31.6M AWP
  - 15.8M → WorkNet workers (miners)
  - 15.8M → DAO Treasury
- Formula: `E(t) = 2 × 15.8M × e^(-λt)`, λ = 3.16×10⁻³ day⁻¹
- Discrete: `E_{n+1} = E_n × 996,844 / 1,000,000`

## Voting Power (Correct — per whitepaper)

Formula: `V(s, τ) = s × min(√(τ/7), 8)` where τ is remaining lock duration in days

- Locked 7 days → 1× multiplier
- Locked 28 days → 2× multiplier
- Locked 112 days → 4× multiplier
- Locked ≥448 days → **8× maximum** (√(448/7) = √64 = 8)
- Sub-linear: doubling lock time increases power by only ~41%

## Multi-Chain Note

AWP is natively multi-chain. "Subnet 1" on BSC and "WorkNet 1" on Ethereum are separate deployments, not the same entity. When users say "which chain", clarify which deployment they mean.
