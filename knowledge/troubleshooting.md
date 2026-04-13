# Troubleshooting Guide

> **Agent-first rule**: All commands are run by the user's AI agent. Never show users shell commands to run manually.

## General Diagnosis Flow

1. **What's the exact error?** (screenshot or copy-paste)
2. **Which component?** (wallet / worker / API / registration)
3. **When did it last work?** (never / used to work / just broke)

## AWP Wallet Errors

### `No wallet found`
**Fix**: Agent runs `awp-wallet setup`

### `awp-wallet: command not found`
**Fix**: Agent runs install script from awp-wallet repo

### `Invalid or expired session token`
**Fix**: Agent runs `awp-wallet setup`

### `Insufficient balance for transfer + gas`
**Fix**: Need ETH on Base for gas, or configure gasless mode with `PIMLICO_API_KEY`

## Registration Errors

### `address_not_registered`
**Fix**: Install AWP Skill and complete registration:
```
skill install https://github.com/awp-core/awp-skill
```
Then: `awp start`

### `cycle detected`
**Cause**: Circular binding tree (A→B→A)
**Fix**: Redesign binding structure

## Staking Errors

### `PositionExpired`
**Cause**: veAWP lock expired
**Fix**: Withdraw first, then create new deposit

### `Insufficient balance`
**Cause**: Not enough AWP for operation
**Fix**: Acquire more AWP

## Network Errors

### `Timeout`
**Cause**: API not responding
**Action**: Retry. Check API health.

### `429 Too Many Requests`
**Cause**: Rate limited
**Action**: Wait and retry. Agent auto-throttles.

### `500+` Server errors
**Action**: Agent auto-retries with backoff

## WorkNet-Specific Issues

For WorkNet-specific errors, see the WorkNet's troubleshooting guide:
- Mine WorkNet: `worknets/mine/troubleshooting.md`

## Getting Help

1. Run diagnostics (agent: `doctor` command if available)
2. Check GitHub issues for the relevant repo
3. Ask in Discord with exact error message
