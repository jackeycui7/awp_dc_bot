# Smart Contracts Reference

## Getting Current Contract Addresses

Contract addresses are served dynamically — always fetch from the API rather than hardcoding:

```bash
curl https://api.awp.sh/api/registry
```

This returns all deployed contract addresses. All contracts share the same address across all supported chains.

**Supported chains**: Ethereum (1), BSC (56), Base (8453), Arbitrum (42161)

## Contract Addresses

| Contract | Address |
|----------|---------|
| AWP Token | `0x0000A1050AcF9DEA8af9c2E74f0D7CF43f1000A1` |
| AWP Registry | `0x0000F34Ed3594F54faABbCb2Ec45738DDD1c001A` |
| AWP Emission | `0x3C9cB73f8B81083882c5308Cce4F31f93600EaA9` |
| AWP Allocator | `0x0000D6BB5e040E35081b3AaF59DD71b21C9800AA` |
| veAWP | `0x0000b534C63D78212f1BDCc315165852793A00A8` |
| AWP WorkNet | `0x00000bfbdEf8533E5F3228c9C846522D906100A7` |
| LP Manager | `0x00001961b9AcCD86b72DE19Be24FaD6f7c5b00A2` |
| Worknet Token Factory | `0x000058EF25751Bb3687eB314185B46b942bE00AF` |
| DAO | `0x00006879f79f3Da189b5D0fF6e58ad0127Cc0DA0` |
| Treasury | `0x82562023a053025F3201785160CaE6051efD759e` |

## Contract Overview

### AWP Token
- **Address**: `0x0000A1050AcF9DEA8af9c2E74f0D7CF43f1000A1`
- **Role**: The main ERC20 token
- **Standard**: ERC20 + ERC20Permit (EIP-2612) + ERC20Burnable + ERC1363
- **Max supply**: 10B AWP
- **Key function**: `mintAndCall(to, amount, data)` — mints tokens and triggers ERC1363 callback on recipient (used by emission settlement)
- **Minter**: Only AWP Emission contract can mint (admin renounced at launch)

### AWP Registry
- **Address**: `0x0000F34Ed3594F54faABbCb2Ec45738DDD1c001A`
- **Role**: The unified entry point for all user interactions
- **Key operations**:
  - `bind(target)` — set parent in the delegation tree (gasless available)
  - `register()` — register address as a principal (optional, sets recipient to self)
  - `allocate(staker, agent, subnetId, amount)` — assign stake to an agent+subnet pair
  - `deallocate / reallocate` — adjust allocations
  - `registerSubnet(params)` — deploy a new WorkNet (costs 1M AWP for LP)
  - `activateSubnet / pauseSubnet / resumeSubnet` — lifecycle management
- **Gasless relay**: bind, setRecipient, register, allocate, deallocate, activateSubnet, registerSubnet all support EIP-712 gasless relay (zero ETH needed)

### veAWP
- **Address**: `0x0000b534C63D78212f1BDCc315165852793A00A8`
- **Role**: ERC721 NFTs representing time-locked AWP positions
- **Key operations**:
  - `deposit(amount, lockDuration)` — mint a position NFT, lock AWP
  - `depositWithPermit(...)` — gasless deposit using ERC-2612 permit
  - `addToPosition(tokenId, amount, newLockEnd)` — add to existing position (blocked if lock expired)
  - `withdraw(tokenId)` — burn NFT and reclaim AWP (only after lock expires)
- **Transfer restriction**: Cannot transfer if sender would become under-collateralized (more allocated than staked)
- **Voting power**: `V(s, τ) = s × min(√(τ/7), 8)` where τ is remaining lock days; capped at 8× for τ≥448 days

### AWP Allocator
- **Address**: `0x0000D6BB5e040E35081b3AaF59DD71b21C9800AA`
- **Role**: Stores allocation bookkeeping (`onlyAWPRegistry` for all writes)
- **Tracks**: `allocations[staker][agent][subnetId]`, total allocated per staker, total stake per subnet
- **Auto-freeze**: `freezeAgentAllocations` zeros all allocations for a (staker, agent) pair across all subnets

### AWP Emission
- **Address**: `0x3C9cB73f8B81083882c5308Cce4F31f93600EaA9`
- **Role**: Epoch settlement and exponential decay emission engine
- **Key operations**:
  - `submitAllocations(recipients, weights, signatures, effectiveEpoch)` — oracle multi-sig submits weights
  - `settleEpoch(limit)` — processes settlement in batches (anyone can call; keeper calls every 30s)
- **Phase settlement**: 3-phase process (initialize → batch mint → finalize)
- **Emergency**: `emergencySetWeight` available to Timelock only

### AWP WorkNet
- **Address**: `0x00000bfbdEf8533E5F3228c9C846522D906100A7`
- **Role**: ERC721 NFTs representing WorkNet ownership
- **Immutable** (set at mint): name, subnetManager address, alphaToken address
- **Owner-updatable**: `skillsURI` (link to SKILL.md), `minStake` (recommendation, not enforced on-chain)

### SubnetManager (per-WorkNet, not in registry)
- **Role**: Deployed per WorkNet; receives AWP emissions and distributes Work Tokens to workers
- **Roles**: ADMIN, MERKLE_ROLE (submit Merkle roots), STRATEGY_ROLE, TRANSFER_ROLE
- **Merkle distribution**:
  - `setMerkleRoot(epoch, root)` — MERKLE_ROLE sets root after settlement
  - `claim(epoch, amount, proof[])` — workers claim their Work Tokens
  - Leaf encoding: `keccak256(keccak256(abi.encode(account, amount)))`
- **AWP strategies** (triggered automatically via ERC1363 when emissions arrive):
  - `Reserve (0)` — AWP stays in contract (default)
  - `AddLiquidity (1)` — single-sided AWP added to DEX pool above current price
  - `BuybackBurn (2)` — swap AWP→Work Token on DEX, burn the Work Token

### LP Manager
- **Address**: `0x00001961b9AcCD86b72DE19Be24FaD6f7c5b00A2`
- **Role**: Creates and permanently holds the Work Token/AWP liquidity pool for each WorkNet
- **Pool parameters**: Full-range CL pool, 1% fee, 200 tick spacing
- **LP is permanently locked** — cannot be withdrawn by anyone

### Worknet Token Factory
- **Address**: `0x000058EF25751Bb3687eB314185B46b942bE00AF`
- **Role**: Deploys Work Token contracts via CREATE2 (deterministic addresses)
- **Vanity rule**: Optional 8-position hex pattern validation (prefix + suffix)
- **Called by**: AWP Registry during WorkNet registration

### Work Token (AlphaToken, per-WorkNet)
- **Role**: Per-WorkNet ERC20 token (also called Alpha Token)
- **Max supply**: 10B per WorkNet
- **Dual-minter lifecycle**: AWP Registry mints initial LP → `setSubnetMinter(subnetContract)` permanently locks WorkNet as sole minter
- **Time-based mint cap**: After lock, can only mint proportionally to time elapsed (prevents dump)

### DAO
- **Address**: `0x00006879f79f3Da189b5D0fF6e58ad0127Cc0DA0`
- **Role**: NFT-based governance using veAWP voting power
- **Two proposal types**:
  - `proposeWithTokens(...)` — executable, goes through Treasury Timelock (2-day delay)
  - `signalPropose(...)` — vote-only signal, no on-chain execution
- **Threshold**: 1,000,000 AWP worth of voting power to create a proposal
- **Anti-manipulation**: Only NFTs created before a proposal can vote on it

### Treasury
- **Address**: `0x82562023a053025F3201785160CaE6051efD759e`
- **Role**: TimelockController wrapping governance execution
- **Delay**: 2 days minimum between proposal queuing and execution
- **Receives**: 50% of all AWP emissions (the DAO share)
- **Controls**: All `onlyTimelock` operations (ban/unban WorkNets, emergency overrides, parameter changes)

## Account System

AWP uses a **tree-based binding system** — no mandatory registration:

```
Cold wallet (root)
  └── bind() ← Hot wallet (agent)
        └── resolveRecipient() walks up to root
```

- Every address is implicitly a root
- `bind(target)` sets your parent in the tree
- `resolveRecipient(addr)` walks up the tree to find where rewards go
- `register()` = shortcut for "set recipient to self" (solo mining)
- Anti-cycle check prevents circular bindings (depth limit: 100 hops)

## Key Protocol Constants

| Constant | Value |
|----------|-------|
| Max active subnets | 10,000 |
| Initial Alpha mint per subnet | 1,000,000,000 (1B) |
| Initial Alpha price | 0.001 AWP |
| Subnet AMM pool creation cost | 1,000,000 AWP |
| Immunity period (before deregister) | 30 days |
| Governance timelock delay | 2 days |
| Max binding tree depth | 100 |
| Min lock duration (veAWP) | 1 day |
| Max voting weight lock | 448 days (8× cap) |
