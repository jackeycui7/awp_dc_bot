// Knowledge base loader — reads markdown files from nested directories
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');

const files = new Map();

// Recursively load all .md files
function loadDir(dir, prefix = '') {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const relPath = prefix ? `${prefix}/${name}` : name;

    if (statSync(fullPath).isDirectory()) {
      loadDir(fullPath, relPath);
    } else if (name.endsWith('.md')) {
      files.set(relPath, readFileSync(fullPath, 'utf-8'));
    }
  }
}

loadDir(KNOWLEDGE_DIR);

export function listKnowledgeFiles() {
  return [...files.keys()];
}

export function readKnowledge(path) {
  // Try exact match first
  if (files.has(path)) {
    return { path, content: files.get(path) };
  }

  // Try with .md extension
  if (files.has(path + '.md')) {
    return { path: path + '.md', content: files.get(path + '.md') };
  }

  // Try finding by filename only (backwards compatibility)
  for (const [key, content] of files) {
    if (key.endsWith('/' + path) || key === path) {
      return { path: key, content };
    }
  }

  return { error: `File not found: ${path}. Available: ${[...files.keys()].slice(0, 20).join(', ')}...` };
}

// Condensed index for system prompt
export function knowledgeIndex() {
  // Group files by directory
  const protocol = [];
  const worknets = {};
  const root = [];

  for (const path of files.keys()) {
    if (path.startsWith('protocol/')) {
      protocol.push(path);
    } else if (path.startsWith('worknets/')) {
      const parts = path.split('/');
      const wn = parts[1];
      if (!worknets[wn]) worknets[wn] = [];
      worknets[wn].push(path);
    } else {
      root.push(path);
    }
  }

  let index = `## Knowledge Base

Use \`read_knowledge\` tool to access documentation.

### Protocol (AWP Core)
`;

  if (protocol.length > 0) {
    for (const p of protocol.sort()) {
      index += `- ${p}\n`;
    }
  } else {
    // Fallback to old structure
    index += `- terminology.md — Key terms
- what-is-awp.md — Project overview
- tokenomics.md — Token economics
- staking.md — Staking, binding, voting power
- wallet.md — awp-wallet commands
- governance.md — DAO proposals
- contracts.md — Smart contract addresses
- api-reference.md — API endpoints
`;
  }

  index += `
### WorkNets
`;

  if (Object.keys(worknets).length > 0) {
    for (const [wn, paths] of Object.entries(worknets)) {
      index += `\n**${wn}/**\n`;
      for (const p of paths.sort()) {
        index += `- ${p}\n`;
      }
    }
  } else {
    index += `- 15-datamine-worknet.md — Mine WorkNet (aDATA)
`;
  }

  index += `
### General
`;

  const generalFiles = root.filter(f => !f.startsWith('code-') && !f.startsWith('AWP_'));
  for (const p of generalFiles.sort()) {
    index += `- ${p}\n`;
  }

  return index;
}
