# Smart Contracts Reference

## Getting Current Contract Addresses

Contract addresses are served dynamically — always fetch from the API rather than hardcoding:

```bash
curl https://tapi.awp.sh/api/registry
```

This returns all deployed contract addresses plus the EIP-712 domain config.

## Contract Overview (11 Contracts)

### AWPToken
- **Role**: The main ERC20 token
- **Standard**: ERC20 + ERC20Permit (EIP-2612) + ERC20Burnable + ERC1363
- **Max supply**: 10B AWP
- **Key function**: `mintAndCall(to, amount, data)` — mints tokens and triggers ERC1363 callback on recipient (used by emission settlement)
- **Minter**: Only AWPEmission contract can mint (admin renounced at launch)

### AWPRegistry
- **Role**: The unified entry point for all user interactions
- **Key operations**:
  - `bind(target)` — set parent in the delegation tree (gasless available)
  - `register()` — register address as a principal (optional, sets recipient to self)
  - `allocate(staker, agent, subnetId, amount)` — assign stake to an agent+subnet pair
  - `deallocate / reallocate` — adjust allocations
  - `registerSubnet(params)` — deploy a new subnet (costs 1M AWP for LP)
  - `activateSubnet / pauseSubnet / resumeSubnet` — lifecycle management
- **Gasless relay**: bind, setRecipient, register, allocate, deallocate, activateSubnet, registerSubnet all support EIP-712 gasless relay (zero ETH needed)

### StakeNFT
- **Role**: ERC721 NFTs representing time-locked AWP positions
- **Key operations**:
  - `deposit(amount, lockDuration)` — mint a position NFT, lock AWP
  - `depositWithPermit(...)` — gasless deposit using ERC-2612 permit
  - `addToPosition(tokenId, amount, newLockEnd)` — add to existing position (blocked if lock expired)
  - `withdraw(tokenId)` — burn NFT and reclaim AWP (only after lock expires)
- **Transfer restriction**: Cannot transfer if sender would become under-collateralized (more allocated than staked)
- **Voting power**: `amount × sqrt(min(remainingTime, 54weeks) / 7days)`

### StakingVault
- **Role**: Stores allocation bookkeeping (`onlyAWPRegistry` for all writes)
- **Tracks**: `allocations[staker][agent][subnetId]`, total allocated per staker, total stake per subnet
- **Auto-freeze**: `freezeAgentAllocations` zeros all allocations for a (staker, agent) pair across all subnets

### AWPEmission *(DRAFT — upgradeable via UUPS proxy)*
- **Role**: Epoch settlement and exponential decay emission engine
- **Key operations**:
  - `submitAllocations(recipients, weights, signatures, effectiveEpoch)` — oracle multi-sig submits weights
  - `settleEpoch(limit)` — processes settlement in batches (anyone can call; keeper calls every 30s)
- **Phase settlement**: 3-phase process (initialize → batch mint → finalize)
- **Emergency**: `emergencySetWeight` available to Timelock only

### SubnetNFT
- **Role**: ERC721 NFTs representing subnet ownership
- **Immutable** (set at mint): name, subnetManager address, alphaToken address
- **Owner-updatable**: `skillsURI` (link to SKILL.md), `minStake` (recommendation, not enforced on-chain)

### SubnetManager (default, BSC variant)
- **Role**: Deployed per subnet; receives AWP emissions and distributes Alpha tokens to workers
- **Roles**: ADMIN, MERKLE_ROLE (submit Merkle roots), STRATEGY_ROLE, TRANSFER_ROLE
- **Merkle distribution**:
  - `setMerkleRoot(epoch, root)` — MERKLE_ROLE sets root after settlement
  - `claim(epoch, amount, proof[])` — workers claim their Alpha tokens
  - Leaf encoding: `keccak256(keccak256(abi.encode(account, amount)))`
- **AWP strategies** (triggered automatically via ERC1363 when emissions arrive):
  - `Reserve (0)` — AWP stays in contract (default)
  - `AddLiquidity (1)` — single-sided AWP added to DEX pool above current price
  - `BuybackBurn (2)` — swap AWP→Alpha on DEX, burn the Alpha

### LPManager (BSC/PancakeSwap variant)
- **Role**: Creates and permanently holds the Alpha/AWP liquidity pool for each subnet
- **Pool parameters**: Full-range CL pool, 1% fee, 200 tick spacing
- **LP is permanently locked** — cannot be withdrawn by anyone

### AlphaTokenFactory
- **Role**: Deploys AlphaToken contracts via CREATE2 (deterministic addresses)
- **Vanity rule**: Optional 8-position hex pattern validation (prefix + suffix)
- **Called by**: AWPRegistry during subnet registration

### AlphaToken
- **Role**: Per-subnet ERC20 token
- **Max supply**: 10B per subnet
- **Dual-minter lifecycle**: AWPRegistry mints initial LP → `setSubnetMinter(subnetContract)` permanently locks subnet as sole minter
- **Time-based mint cap**: After lock, can only mint proportionally to time elapsed (prevents dump)

### AWPDAO
- **Role**: NFT-based governance using StakeNFT voting power
- **Two proposal types**:
  - `proposeWithTokens(...)` — executable, goes through Treasury Timelock (2-day delay)
  - `signalPropose(...)` — vote-only signal, no on-chain execution
- **Threshold**: 1,000,000 AWP worth of voting power to create a proposal
- **Anti-manipulation**: Only NFTs created before a proposal can vote on it

### Treasury
- **Role**: TimelockController wrapping governance execution
- **Delay**: 2 days minimum between proposal queuing and execution
- **Receives**: 50% of all AWP emissions (the DAO share)
- **Controls**: All `onlyTimelock` operations (ban/unban subnets, emergency overrides, parameter changes)

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
| Initial Alpha mint per subnet | 100,000,000 |
| Initial Alpha price | 0.01 AWP |
| Subnet LP creation cost | 1,000,000 AWP |
| Immunity period (before deregister) | 30 days |
| Governance timelock delay | 2 days |
| Max binding tree depth | 100 |
| Min lock duration (StakeNFT) | 1 day |
| Max voting weight lock | 54 weeks |
