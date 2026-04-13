// Tool executor — direct HTTP calls, no shell exec
import { readKnowledge } from '../knowledge.mjs';
import { worknets, listWorknets, getWorknetApi } from '../config/worknets.mjs';

const AWP_API = 'https://api.awp.sh/v2';
const BASE_RPC = 'https://mainnet.base.org';

const TIMEOUT = 10000;

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    if (!res.ok) return { error: `HTTP ${res.status}: ${res.statusText}`, url };
    return await res.json();
  } catch (e) {
    return { error: e.name === 'AbortError' ? `Timeout after ${TIMEOUT}ms` : e.message, url };
  } finally {
    clearTimeout(timer);
  }
}

async function get(url, headers = {}) {
  return fetchWithTimeout(url, { headers });
}

async function jsonRpc(url, method, params = {}) {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });
}

async function rpcCall(method, params) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctrl.signal
    });
    const data = await res.json();
    return data.result;
  } catch (e) {
    return { error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// AWP RootNet API (JSON-RPC 2.0)
async function execAwpApi({ method, params = {} }) {
  const result = await jsonRpc(AWP_API, method, params);
  if (result.error && typeof result.error === 'object' && result.error.message) {
    return { error: result.error.message, code: result.error.code };
  }
  if (result.result !== undefined) {
    return result.result;
  }
  return result;
}

// Generic WorkNet API
async function execWorknetApi({ worknet, command, address, epoch_id }) {
  const apiBase = getWorknetApi(worknet);
  if (!apiBase) {
    return { error: `Unknown worknet: ${worknet}. Available: ${Object.keys(worknets).join(', ')}` };
  }

  // Build endpoint based on worknet type
  // Currently all worknets follow similar API patterns, but can be customized per worknet
  const base = `${apiBase}/api/mining/v1`;

  switch (command) {
    case 'profile':
      return get(`${base}/profiles/${address}`);
    case 'worker':
      return get(`${base}/profiles/miners/${address}`);
    case 'worker_epochs':
      return get(`${base}/profiles/miners/${address}/epochs`);
    case 'validator_epochs':
      return get(`${base}/profiles/validators/${address}/epochs`);
    case 'epoch_snapshot':
      return get(`${base}/epochs/${epoch_id}/snapshot`);
    case 'epoch_settlement':
      return get(`${base}/epochs/${epoch_id}/settlement-results`);
    case 'workers_online':
      return get(`${base}/miners/online`);
    case 'validators_online':
      return get(`${base}/validators/online`);
    case 'workers_list':
      return get(`${base}/miners`);
    case 'config':
      return get(`${apiBase}/api/core/v1/protocol-config`);
    default:
      return { error: `Unknown command: ${command}` };
  }
}

// Base chain query
async function execChainQuery({ command, address }) {
  const AWP_TOKEN = '0x0000A1050AcF9DEA8af9c2E74f0D7CF43f1000A1';
  const ERC20_BALANCE = '0x70a08231';
  const TOTAL_SUPPLY = '0x18160ddd';

  switch (command) {
    case 'awp_balance': {
      const padded = address.slice(2).toLowerCase().padStart(64, '0');
      const raw = await rpcCall('eth_call', [{ to: AWP_TOKEN, data: `${ERC20_BALANCE}${padded}` }, 'latest']);
      if (raw?.error) return raw;
      const wei = BigInt(raw || '0x0');
      return { address, balance: (Number(wei) / 1e18).toFixed(4), raw: wei.toString() };
    }
    case 'eth_balance': {
      const raw = await rpcCall('eth_getBalance', [address, 'latest']);
      if (raw?.error) return raw;
      const wei = BigInt(raw || '0x0');
      return { address, balance: (Number(wei) / 1e18).toFixed(6), raw: wei.toString() };
    }
    case 'total_supply': {
      const raw = await rpcCall('eth_call', [{ to: AWP_TOKEN, data: TOTAL_SUPPLY }, 'latest']);
      if (raw?.error) return raw;
      const wei = BigInt(raw || '0x0');
      return { totalSupply: (Number(wei) / 1e18).toFixed(0), raw: wei.toString() };
    }
    case 'block': {
      const raw = await rpcCall('eth_blockNumber', []);
      if (raw?.error) return raw;
      return { blockNumber: parseInt(raw, 16) };
    }
    default:
      return { error: `Unknown command: ${command}` };
  }
}

// GitHub query
async function execGithubQuery({ command, repo }) {
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'awp-bot' };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `token ${token}`;

  const repoOrg = {
    'awp-skill': 'awp-core',
    'awp-wallet': 'awp-core',
    'rootnet': 'awp-core',
    'mine-skill': 'awp-worknet',
    'data-mining-platform': 'data-mining-org'
  };

  const org = repoOrg[repo] || 'awp-core';
  const repoName = repo || 'awp-wallet';
  const ghGet = (path) => get(`https://api.github.com${path}`, headers);

  switch (command) {
    case 'issues':
      return ghGet(`/repos/${org}/${repoName}/issues?state=open&per_page=10`);
    case 'releases':
      return ghGet(`/repos/${org}/${repoName}/releases?per_page=5`);
    case 'repo':
      return ghGet(`/repos/${org}/${repoName}`);
    case 'contributors':
      return ghGet(`/repos/${org}/${repoName}/contributors?per_page=10`);
    default:
      return { error: `Unknown command: ${command}` };
  }
}

// Main dispatcher
export async function executeTool(name, input) {
  try {
    switch (name) {
      case 'awp_api':
        return await execAwpApi(input);
      case 'worknet_api':
        return await execWorknetApi(input);
      case 'chain_query':
        return await execChainQuery(input);
      case 'github_query':
        return await execGithubQuery(input);
      case 'list_worknets':
        return listWorknets();
      case 'read_knowledge':
        return readKnowledge(input.path);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e.message };
  }
}
