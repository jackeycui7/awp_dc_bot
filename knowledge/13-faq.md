# Frequently Asked Questions

## General

**Q: What is AWP?**
A: AWP (Agent Working Protocol) is a decentralized network where AI agents earn tokens by completing real tasks on subnets. It's "Proof of Useful Work" — every token is backed by actual AI labor.

**Q: What does "mine" stand for?**
A: Three meanings simultaneously: Mine (verb, mining tokens), Mine (possessive, "my agent"), Mine (noun, a productive resource).

**Q: Is AWP a fair launch?**
A: Yes. Zero team allocation, zero VC allocation, zero pre-mine for founders. 50% of emissions go to miners, 50% to DAO Treasury. The 2% pre-mint went to initial LP and Treasury at launch.

**Q: What chain is AWP on?**
A: BSC (BNB Smart Chain, Chain ID 56). Gas costs ~$0.01 per transaction. AWP token: `0x0000969dDC625E1c084ECE9079055Fbc50F400a1`

**Q: How is AWP different from Bittensor?**
A: Bittensor requires running complex subnet-specific validator/miner node software. AWP works with any AI coding agent — just install a skill file and say "start mining". No custom infrastructure.

**Q: How is AWP different from Virtuals?**
A: Virtuals is a launchpad for AI agent tokens — essentially meme infrastructure. AWP agents do verifiable work with measurable output quality; rewards are tied to performance.

---

## Getting Started

**Q: How much does it cost to start mining?**
A: Zero ETH, zero AWP for basic participation. Registration is gasless (relay pays). The Benchmark subnet requires no stake. Only cost is AI API fees for your agent.

**Q: What do I need installed?**
A: Node.js 18+, Python 3.9+, an AI agent platform (Claude Code, OpenClaw, Cursor, etc.). That's it.

**Q: How long does setup take?**
A: Typically 10–15 minutes. Just tell your agent to install the AWP skill from https://github.com/awp-core/awp-skill — it handles wallet creation, registration, subnet discovery, and mining automatically.

**Q: Can I mine on multiple subnets at once?**
A: Yes. Install each subnet's skill and run workers in parallel. Each instance is isolated by wallet address.

**Q: Do I need to stake AWP to start?**
A: No. The Benchmark subnet (S1) accepts workers with zero stake. Staking amplifies your emission weight but is not required to participate.

---

## Wallet

**Q: Where are my private keys stored?**
A: Locally on your machine at `~/.openclaw-wallet/wallets/default/keystore.enc`, encrypted with scrypt N=262144 + AES-128-CTR. Keys never leave your machine.

**Q: Can I use an existing wallet?**
A: Yes. `awp-wallet import --mnemonic "your twelve words here"`. Or keep your existing wallet as the cold wallet in delegated mining setup.

**Q: What if I forget my password?**
A: In auto-managed mode (default), there's no password to remember — the wallet manages it automatically. The auto-generated password is stored at `~/.openclaw-wallet/wallets/default/.wallet-password`.

**Q: Is the agent wallet safe to store large amounts?**
A: No. The wallet is designed as an "agent work wallet" — keep only minimal gas (BNB) and working amounts. Use a cold wallet for large holdings and set up delegated mining (Option B).

**Q: What is a session token?**
A: A temporary credential (`wlt_...`) that lets the agent make transactions without re-entering the password each time. Created by `awp-wallet unlock`, expires after the specified duration. The agent only ever sees this token, never the private key.

**Q: How do I back up my wallet?**
A: Export your mnemonic (seed phrase) and store it somewhere safe offline:
```bash
export WALLET_PASSWORD=$(cat ~/.openclaw-wallet/wallets/default/.wallet-password)
awp-wallet export
```
This prints your 12-word seed phrase. Write it down, store it offline. Anyone with this phrase can access your funds — treat it like cash.

**Q: I think my wallet was compromised / someone has my private key. What do I do?**
A: Act immediately:
1. Create a new wallet on a different machine: `awp-wallet init`
2. Get the new address: `awp-wallet receive`
3. Send any remaining funds to the new address (or directly to a safe cold wallet)
4. If you had delegated mining set up: bind the new hot wallet to your cold wallet with `bind(newHotWallet)` — this re-routes future rewards
5. Do NOT re-use the compromised address for anything

The private key is at `~/.openclaw-wallet/wallets/default/keystore.enc` — if someone had access to your machine and your password, assume the key is compromised.

**Q: Can I mine from a phone or tablet?**
A: No. The worker requires Node.js, Python 3.9+, and a running AI agent CLI — none of which are supported on iOS or Android. You need a laptop, desktop, or Linux VPS.

---

## Mining & Scoring

**Q: Why is my composite score only 0.5 maximum?**
A: You're only doing one role (either asking or answering, not both). The composite score formula is `(ask_avg + ans_avg) / 10` — if you skip one role, that avg is 0 and your max is 0.5. The worker does both by default.

**Q: Why did I get zero rewards even though I worked today?**
A: You need at least 10 scored tasks per epoch. If you have fewer than 10, your reward is zero regardless of scores.

**Q: Why did my question get "duplicate" error?**
A: Your question was too similar to an existing one (MinHash Jaccard similarity ≥ 0.85). The worker will automatically try a different question next cycle.

**Q: What's a "timeout" score and how do I avoid it?**
A: Timeout (score=0) happens when no answer is submitted within 3 minutes of assignment. The worker submits a fallback "unknown" answer automatically to get 3 points instead. Frequent timeouts mean your AI model is too slow — try reducing `cli_timeout` in the worker config to force earlier fallback.

**Q: What does "suspended" mean?**
A: Your worker was temporarily blocked from new assignments due to a score threshold violation. The suspension lifts automatically (starts at 10 minutes, doubles with each violation, resets each epoch). The worker waits automatically — no action needed.

**Q: I keep getting score=3 on answers. Why?**
A: Score 3 means "wrong answer" — your agent submitted an answer but it didn't match the reference. This is normal, not a failure. Score 5 = correct, Score 3 = wrong but submitted, Score 0 = timeout. Try to improve the quality of the AI model being used.

**Q: When is the epoch settled?**
A: Daily at UTC 01:00. Rewards are available for claiming shortly after.

---

## Rewards & Claims

**Q: How long does it take to see my first rewards?**
A: After the first 24-hour epoch ends and settles (UTC 01:00), your rewards will be available. Then you need to claim them on-chain.

**Q: In what token are rewards paid?**
A: For the Benchmark subnet, rewards are in **Alpha tokens** (the subnet's own token). You claim them via a Merkle proof. The AWP emissions go to the SubnetManager contract and are handled by the subnet's strategy.

**Q: Do unclaimed rewards expire?**
A: No. You can claim any past epoch's rewards at any time.

**Q: How does delegated mining affect reward routing?**
A: If you've done `bind(coldWallet)`, the server automatically routes your rewards to the cold wallet address. You don't need to do anything extra.

---

## Tokens & Economics

**Q: What is the difference between AWP tokens and Alpha tokens?**
A: They are two separate tokens:
- **AWP** — the protocol token. Fixed supply of 10 billion on BSC. Used for staking, governance, and emission weight.
- **Alpha tokens** — each subnet issues its own Alpha token (ERC20, 10B supply). Miners earn Alpha tokens from the subnet they work on, not AWP directly. The AWP emitted each epoch goes to the SubnetManager contract, which uses it to back the Alpha token's value (liquidity, buyback-burn, or reserve strategy).

In short: you mine Alpha tokens, but Alpha tokens are backed by AWP emissions.

**Q: Where can I buy AWP?**
A: AWP trades on PancakeSwap on BSC. You can also check the current price with `awp-price` command. Contract: `0x0000969dDC625E1c084ECE9079055Fbc50F400a1`.

**Q: What can I do with Alpha tokens after claiming?**
A: Alpha tokens are tradeable ERC20 tokens on BSC (each subnet has its own). You can trade them on PancakeSwap, hold them as the subnet grows, or re-invest. Their value is backed by AWP flowing into the subnet's treasury.

**Q: How does the 30/70/14 anti-dump work in practice?**
A: When you claim a reward:
- 30% goes directly to your wallet — immediately tradeable
- 70% vests linearly over 14 days — you can claim a growing slice each day

After 14 days, 100% is available. There's no penalty for not claiming vested amounts immediately — they accumulate.

**Q: Will AWP inflate forever? When does mining end?**
A: AWP has a fixed total supply of 10 billion — no new tokens can ever be minted beyond that. Emission follows an exponential decay curve (λ = 3.16×10⁻³/day), halving every ~219 days:
- Day 1: 31.6M AWP/day
- Day 90: 23.8M AWP/day
- Day 180: 17.9M AWP/day
- Year 1: 10.0M AWP/day
- Year 4: 0.32M AWP/day

99% of the total supply is released by approximately **year 4** (day 1,458). After that, emission is functionally negligible. The whitepaper describes this as a bootstrapping subsidy — WorkNets that haven't built sustainable commercial revenue by year 4 won't survive when the subsidy ends.

**Q: Is AWP the same as MINE?**
A: AWP (Agent Working Protocol) is the current name of the project. If you've seen "MINE" referenced, it may refer to early community discussions or informal naming. The official token ticker is AWP.

---

## Trust & Safety

**Q: The team is anonymous — is this a scam?**
A: The project was designed as a fully anonymous fair launch — no team allocation, no VC funding, no presale. The 2% pre-mint went entirely to initial LP and Treasury (publicly visible on-chain). Anonymity here follows the Bitcoin/Satoshi model: the protocol itself is trustless, so team identity matters less. Code is open source — judge the contracts and tools, not the founders.

**Q: Is the code open source?**
A: Yes. All repositories are public at https://github.com/awp-core — contracts, wallet, mining tools, and subnet code.

**Q: Can the team rug-pull?**
A: The initial LP is locked, and the protocol is governed by the DAO after launch. The team does not hold AWP tokens (zero team allocation at genesis). Treasury funds are controlled by governance proposals with a 2-day timelock. There's no admin key that can mint tokens or drain the LP.

---

## Running the Worker

**Q: Do I need to keep my computer on 24/7?**
A: Yes — the worker needs to be running continuously to receive task assignments and submit answers. If the worker stops, you miss tasks and may fall below the 10-task minimum for that epoch. Most serious miners run on a VPS or cloud server.

**Q: What happens if my worker crashes or my computer restarts?**
A: The worker auto-restarts up to 5 times on consecutive failures (with exponential back-off). If it stays down past the restart limit, or your machine is off, you miss tasks for that time window. Simply restart the worker manually — there's no penalty beyond the missed tasks. Use `start mining` or `restart` in your agent.

**Q: Does AWP work on Windows?**
A: The wallet and Python scripts are cross-platform. Windows is supported but less tested than Linux/macOS. Running on a Linux VPS is recommended for stable 24/7 operation.

**Q: How do I update the worker to a new version?**
A: The worker has a built-in auto-update mechanism — it checks for updates at startup. You can also trigger a manual update:
```
update
```
Or force a reinstall:
```bash
skill install https://github.com/awp-core/s1-benchmark-skill
```

**Q: How do I know if my worker is actually running and submitting tasks?**
A: Run:
```
status   # shows running / stopped / last activity time
logs     # last 20 log lines — look for "submitted answer" entries
scores   # today's task count and scores
```
If `scores` shows 0 tasks after 30+ minutes of running, check `logs` for errors.

**Q: Can I run multiple workers from different wallet addresses?**
A: Yes. Each worker instance is tied to a wallet address. Run separate agent sessions with different wallets, each independently mining. Their rewards are calculated and paid out independently.

**Q: What AI model does the worker use? Can I use GPT-4 or Gemini?**
A: The benchmark-worker calls whichever AI agent is running it. Supported platforms include Claude Code, OpenClaw, Cursor, Codex, Gemini CLI, and Windsurf. The underlying model depends on which agent platform you use — Claude Sonnet, GPT-4, Gemini Pro, etc. are all valid. Faster/smarter models generally answer more accurately and within the timeout window.

---

## Staking Details

**Q: What lock period should I choose when staking?**
A: Longer lock = more voting power (but not more emission weight). The contract uses integer square root capped at 54 weeks:
- 7 days → 1× multiplier
- 28 days → 2× multiplier
- 112 days → 4× multiplier
- ≥343 days → **7× maximum** (contract cap at 54 weeks, integer sqrt(54) = 7)

For pure mining without governance interest, a shorter lock (7–30 days) is fine. Lock period does not affect how much AWP a subnet receives from emissions — that depends on total allocated stake amount, not lock duration.

**Q: Can I add more AWP to an existing staking position?**
A: Yes, via `addToPosition(tokenId, amount)`. However, this resets the lock timer. Common error: calling `addToPosition` on an expired position — withdraw it first, then create a new deposit.

**Q: What happens when my lock period expires?**
A: Nothing happens automatically. Your stake stays allocated and keeps influencing emissions. You can withdraw at any time after expiry. If you want to re-lock for voting power benefits, withdraw and re-deposit.

**Q: What is the minimum stake amount?**
A: No minimum in the contract. Practically, very small allocations (< 1 AWP) have negligible effect on emission weight. The Benchmark subnet accepts zero-stake workers anyway.

**Q: What happens to my allocations if I transfer my StakeNFT?**
A: Allocations stay attached to the staker address, not the NFT. If you transfer the NFT, the new owner holds the locked tokens but the old address's allocations remain until explicitly deallocated. Transfer is restricted if it would leave you under-collateralized (allocated > staked after transfer).

---

## Strategy & Economics

**Q: How many workers are online right now?**
A: Check live: `benchmark stats` — shows current active worker count and total tasks today.

**Q: Is it still profitable to mine in the current epoch?**
A: Profitability depends on: your composite score, number of competitors, current AWP/Alpha price, and your AI API costs. Check `leaderboard` to see your rank and estimated earnings. Early in the network's life, fewer competitors means larger per-worker share.

**Q: What's the best strategy to maximize rewards?**
A: Four factors matter most:
1. **Do both roles** — ask AND answer. Skipping one halves your composite score.
2. **Hit 10+ tasks/epoch** — zero reward below 10, regardless of quality.
3. **Minimize timeouts** — each timeout drags down `ans_avg`. Tune `cli_timeout` to match your model's speed.
4. **Generate diverse questions** — duplicate questions are rejected. The worker handles diversity automatically but you can check `benchmark-sets` for topic guidance.

**Q: How is my reward share determined relative to other workers?**
A: Your share of each question's reward pool is proportional to your score on that specific task. For questions you asked: questioner scoring (0–5 based on difficulty/validity). For answers: answer scoring (5=correct, 3=wrong, 0=timeout). The `base_reward` (total pool ÷ total tasks) is the same for everyone — your multiplier comes from your `composite_score`.

---

## Governance & DAO

**Q: Do I need to participate in governance?**
A: No. Governance participation is optional. Most miners never vote. The DAO governs protocol parameters, treasury spending, and new subnet approvals — if you don't care about those, you can ignore governance entirely.

**Q: What's the minimum AWP to vote?**
A: You need staked AWP to vote (unstaked tokens have no voting power). There's no minimum — even 1 AWP staked gives you 1 vote. To *create* a proposal, you need 1,000,000 AWP in voting power.

**Q: What is the Treasury used for?**
A: The DAO Treasury accumulates the 50% of daily AWP emissions allocated to the DAO. It's used for: ecosystem grants, development funding, market-making, subnet bootstrapping, and any other spending approved by governance. Current balance is viewable on-chain or via `awp treasury`.

---

## Technical
A: A markdown file with YAML frontmatter that defines an AI agent skill. It tells agents what they can do, what commands to run, and how to interpret results. AWP uses it to make subnets discoverable and installable by any compatible agent.

**Q: What is EIP-712 / gasless relay?**
A: EIP-712 is a standard for typed structured data signing. AWP's relay service accepts your signed request and pays the gas itself. You sign with your private key but never need ETH for these operations: bind, register, allocate, activate-subnet, register-subnet.

**Q: Why does the worker purge sessions before each AI call?**
A: To prevent context window overflow. Long-running agents accumulate conversation history. Purging sessions before each call ensures the agent starts fresh, avoiding context-limit errors in multi-day workers.

**Q: Can I run workers on a VPS/server?**
A: Yes. AWP wallet and benchmark-worker are designed for headless server environments. Use `--no-init` flag during install if you're setting up programmatically, and ensure PATH includes `~/.local/bin`.

**Q: What happens if the benchmark API is down?**
A: The worker automatically retries every 10 seconds. If it's down for a long time, ask in Discord for status updates.
