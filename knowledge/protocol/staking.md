# Staking Guide

## Overview

Staking in AWP means locking AWP tokens in a veAWP position and allocating that stake to (agent, subnet) pairs. Staked AWP amplifies the emission weight of backed agents — more stake behind an agent means more AWP minted to that subnet each epoch.

**Staking is optional for some WorkNets** — many allow participation with zero stake. Staking becomes relevant when you want to influence emission distribution, meet validator requirements, or boost your returns.

## Three Account Roles

AWP uses three roles to separate fund custody from operational execution:

| Role | Also called | Responsibilities |
|------|-------------|-----------------|
| **Principal** | Cold wallet | Holds AWP, creates veAWP positions, sets reward recipient, participates in governance |
| **Agent** | Hot wallet | Bound to a Principal, executes tasks on WorkNets, rewards routed to Principal automatically |
| **Manager** | Delegate | Granted by Principal to an Agent — can allocate/deallocate stake on behalf of the Principal, but cannot withdraw funds or remove itself |

The Manager role enables **delegated stake allocation**: a Principal can let their Agent manage stake distribution across WorkNets without ever giving up custody. A compromised Manager key cannot lock out the Principal (delegation is asymmetric by design).

## Two Mining Setups

### Option A — Solo Mining
```
[Your address]
  ├── holds veAWP (staker role)
  ├── runs agent work (agent role)
  └── receives rewards (recipient role)
```
One address does everything. Simplest. Best for beginners.

Set up with — tell your agent:
```
start working as solo miner
```

Or via command:
```bash
awp-wallet register --mode principal
```

### Option B — Delegated Mining
```
[Cold wallet]  ←── holds AWP, receives rewards
     ↑ bind()
[Hot wallet]   ←── runs agent, performs tasks
```
Hot wallet binds to cold wallet. Rewards flow to cold wallet. Hot wallet only needs minimal gas.

Set up with — tell your agent:
```
start working as delegated miner, bind to <cold_wallet_address>
```

Or via command:
```bash
awp-wallet register --mode agent --target <cold_wallet_address>
```

**Key rule**: After `bind(target)`, you do NOT need to call `setRecipient` separately. The binding tree handles reward routing automatically.

## Binding System

`bind(target)` creates a parent-child relationship:
- `resolveRecipient(hotWallet)` → follows chain → returns `coldWallet.recipient`
- Anti-cycle protection: cannot create loops (A→B→A is rejected)
- Maximum tree depth: 100 hops

To check your current binding:
```bash
curl https://api.awp.sh/api/users/0x<your_address>
# Returns: { bound_to, recipient, registered_at }
```

## Depositing AWP (Creating a Position)

Deposits require **on-chain transaction** (need BNB for gas on BSC):

```bash
# Option 1: All-in-one — tell your agent:
# "deposit 1000 AWP, lock for 30 days, allocate to subnet 1"

# Option 2: Via awp-wallet commands
awp-wallet deposit --amount 1000 --lock-days 30
# Note the tokenId from output, then:
awp-wallet allocate --staker 0x<you> --agent 0x<agent> --subnet-id 1 --amount 1000
```

**Two-step process**: deposit does `approve(veAWP, amount)` then `deposit(amount, lockDuration)` in sequence.

## veAWP Position Details

Each position is an ERC721 NFT with:
- `amount` — locked AWP
- `lockEndTime` — when you can withdraw
- `createdAt` — used for governance anti-manipulation

**Transfer restriction**: You can transfer a veAWP NFT to another address, but only if you won't become under-collateralized (total staked ≥ total allocated after transfer).

## Allocation

Allocation assigns your staked AWP to influence a specific (agent, subnet) pair's emission weight:

```bash
# Allocate — tell your agent: "allocate 1000 AWP to subnet 1"
awp-wallet allocate --staker 0x<your_address> --agent 0x<agent_address> --subnet-id 1 --amount 1000

# Deallocate — tell your agent: "deallocate 1000 AWP from subnet 1"
awp-wallet deallocate --staker 0x<your_address> --agent 0x<agent_address> --subnet-id 1 --amount 1000

# Reallocate — tell your agent: "move 500 AWP from subnet 1 to subnet 2"
awp-wallet reallocate \
  --staker 0x<your_address> \
  --from-agent 0x<old_agent> --from-subnet 1 \
  --to-agent 0x<new_agent> --to-subnet 2 \
  --amount 500
```

**Constraint**: `total_allocated ≤ total_staked` at all times.

## Withdrawing

Withdrawal is only possible **after the lock period expires**:

```bash
# Tell your agent: "withdraw my staking position"
awp-wallet withdraw --token-id <nft_id>
```

Common error: `PositionExpired` when calling `addToPosition` on an expired lock — you must withdraw first, then create a new deposit.

Check your positions:
```bash
curl https://api.awp.sh/api/staking/user/0x<address>/positions
```

## Gasless Operations

These operations work with **zero ETH** via EIP-712 relay:
- `bind(target)` → tell your agent: "bind to <address>"
- `setRecipient` → tell your agent: "set reward recipient to <address>"
- `register` → tell your agent: "start working"
- `allocate` → tell your agent: "allocate stake to subnet 1"
- `deallocate` → tell your agent: "deallocate stake from subnet 1"
- `activateSubnet` → via relay
- `registerSubnet` → via relay (dual EIP-712: ERC-2612 Permit + RegisterSubnet)

These always require **ETH/BNB for gas**:
- `deposit` (approve + deposit)
- `withdraw`
- `vote` in DAO

## Checking Your Staking Status

```bash
# Via awp-skill agent
awp status   # shows balance, positions, allocations

# Via API directly
curl https://api.awp.sh/api/staking/user/0x<address>/balance
curl https://api.awp.sh/api/staking/user/0x<address>/positions
curl https://api.awp.sh/api/staking/user/0x<address>/allocations
```

## Voting Power

Staked positions grant governance voting power (formula: `s × min(√(τ/7), 8)` where τ is lock duration in days):

Examples:
- 1,000 AWP locked 7 days → 1,000 × 1 = 1,000 power (1×)
- 1,000 AWP locked 28 days → 1,000 × 2 = 2,000 power (2×)
- 1,000 AWP locked 112 days → 1,000 × 4 = 4,000 power (4×)
- 1,000 AWP locked ≥448 days → 1,000 × 8 = 8,000 power (**8× cap**)
- Maximum multiplier: **8× at 448+ days** (√(448/7) = √64 = 8)

Only NFTs created **before** a proposal was submitted can vote on it (anti-manipulation).
