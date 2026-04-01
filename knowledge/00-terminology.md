# Terminology Reference

AWP uses two sets of terminology: the **whitepaper/formal** terms and the **code/technical** terms. Users may use either. This file maps them.

## Core Term Mapping

| Whitepaper Term | Code / Technical Term | Meaning |
|----------------|----------------------|---------|
| **WorkNet** | Subnet | A task domain deployed on-chain. Identified by a numeric ID. |
| **Work Token** | Alpha Token | The per-WorkNet ERC20 token workers earn as rewards. |
| **AWP Power** | Voting power / StakeNFT weight | Governance influence derived from time-locked AWP positions. |
| **Coordinator** | SubnetManager | The smart contract that manages task distribution and reward distribution within a WorkNet. |
| **Principal** | Cold wallet / staker | Holds funds, allocates stake, receives rewards. |
| **Agent** | Hot wallet / worker | Executes tasks, bound to a Principal. |
| **RootNet** | AWP RootNet / protocol layer | The constitutional layer: emission, staking, DAO, governance. |
| **skillURL** | skillsURI | URL pointing to a WorkNet's SKILL.md file for agent discovery. |
| **Position NFT** | StakeNFT | ERC-721 representing a time-locked AWP deposit. |

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

## Voting Power (Correct — from deployed contract)

Contract formula: `s × Math.sqrt(min(remainingTime, 54 weeks) / 7 days)`

- Uses **integer square root** (floor)
- Cap duration: **54 weeks (378 days)**
- Max multiplier: **7×** — because `Math.sqrt(54) = 7` (integer floor of 7.348)
- Representative values: 7d→1×, 28d→2×, 63d→3×, 112d→4×, 175d→5×, 252d→6×, ≥343d→7×

Note: The whitepaper formula shows `min(√(τ/7), 8)` with an 8× cap, but the deployed Solidity contract uses integer sqrt capped at 54 weeks, which gives exactly 7× maximum.

## Multi-Chain Note

AWP is natively multi-chain. "Subnet 1" on BSC and "WorkNet 1" on Ethereum are separate deployments, not the same entity. When users say "which chain", clarify which deployment they mean.
