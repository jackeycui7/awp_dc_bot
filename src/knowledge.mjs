// Knowledge base loader — reads markdown files, provides to Claude as a tool
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');

const files = new Map();

// Load all knowledge files on startup
for (const name of readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'))) {
  files.set(name, readFileSync(join(KNOWLEDGE_DIR, name), 'utf-8'));
}

export function listKnowledgeFiles() {
  return [...files.keys()];
}

export function readKnowledge(filename) {
  const content = files.get(filename);
  if (!content) return { error: `File not found: ${filename}. Available: ${[...files.keys()].join(', ')}` };
  return { filename, content };
}

// Condensed index for system prompt
export function knowledgeIndex() {
  return `Available knowledge files (use read_knowledge tool to access):
- 00-terminology.md — Key terms and naming conventions
- 01-what-is-awp.md — Project overview, narratives, competitors
- 02-tokenomics.md — Token economics, emission, anti-dump
- 03-getting-started.md — New user guide, installation, first mining
- 04-wallet.md — awp-wallet commands, errors, security
- 05-staking.md — Staking, binding, allocation, voting power
- 06-benchmark-subnet.md — Benchmark subnet scoring, roles, sets
- 07-mining-worker.md — Worker operation, health checks, multi-instance
- 08-rewards.md — Reward calculation, epochs, claiming
- 09-subnet-management.md — Subnet creation, lifecycle, AlphaToken
- 10-governance.md — DAO proposals, voting, treasury
- 11-contracts.md — Smart contract addresses and functions
- 12-api-reference.md — API endpoint reference
- 13-faq.md — Frequently asked questions (40+ Q&A)
- 14-troubleshooting.md — Troubleshooting decision tree
- error-index.md — Error messages → root cause + fix (100+ errors)
- code-benchmark-worker.md — benchmark-worker.py internals
- code-wallet-internals.md — awp-wallet internals
- code-subnet-backend.md — subnet-benchmark server internals`;
}
