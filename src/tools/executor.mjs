// Tool executor — direct HTTP calls, no shell exec
import { readKnowledge } from '../knowledge.mjs';

const AWP_API = 'https://tapi.awp.sh';
const BENCH_API = 'https://tapis1.awp.sh';
const BSC_RPC = 'https://bsc-dataseed.binance.org';
const AWP_TOKEN = '0x0000969dDC625E1c084ECE9079055Fbc50F400a1';
const GITHUB_ORG = 'awp-core';

const TIMEOUT = 10000;

async function get(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { error: `HTTP ${res.status}: ${res.statusText}`, url };
    return await res.json();
  } catch (e) {
    return { error: e.name === 'AbortError' ? `Timeout after ${TIMEOUT}ms` : e.message, url };
  } finally {
    clearTimeout(timer);
  }
}

async function rpcCall(method, params) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(BSC_RPC, {
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

// AWP RootNet API
async function execAwpApi({ command, address, subnet_id, status }) {
  switch (command) {
    case 'health': return get(`${AWP_API}/api/health`);
    case 'registry': return get(`${AWP_API}/api/registry`);
    case 'user': return get(`${AWP_API}/api/users/${address}`);
    case 'balance': return get(`${AWP_API}/api/staking/user/${address}/balance`);
    case 'staking_positions': return get(`${AWP_API}/api/staking/user/${address}/positions`);
    case 'staking_balance': return get(`${AWP_API}/api/staking/user/${address}/balance`);
    case 'subnets': return get(`${AWP_API}/api/subnets${status ? `?status=${status}` : ''}`);
    case 'subnet': return get(`${AWP_API}/api/subnets/${subnet_id}`);
    case 'emission': return get(`${AWP_API}/api/emission/current`);
    case 'awp_price': return get(`${AWP_API}/api/tokens/awp`);
    case 'proposals': return get(`${AWP_API}/api/governance/proposals`);
    case 'treasury': return get(`${AWP_API}/api/governance/treasury`);
    default: return { error: `Unknown command: ${command}` };
  }
}

// Benchmark subnet API
async function execBenchmarkApi({ command, address, date }) {
  switch (command) {
    case 'stats': return get(`${BENCH_API}/api/v1/stats`);
    case 'leaderboard': return get(`${BENCH_API}/api/v1/leaderboard`);
    case 'worker': return get(`${BENCH_API}/api/v1/workers/${address}/today`);
    case 'claims':
      if (date) return get(`${BENCH_API}/api/v1/claims/${address}/${date}`);
      return get(`${BENCH_API}/api/v1/claims/${address}`);
    case 'epoch': return get(`${BENCH_API}/api/v1/epochs`);
    case 'benchmark_sets': return get(`${BENCH_API}/api/v1/benchmark-sets`);
    default: return { error: `Unknown command: ${command}` };
  }
}

// BSC chain query
async function execChainQuery({ command, address }) {
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
    default: return { error: `Unknown command: ${command}` };
  }
}

// GitHub query
async function execGithubQuery({ command, repo }) {
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'awp-bot' };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `token ${token}`;

  const ghGet = (path) => get(`https://api.github.com${path}`);

  switch (command) {
    case 'issues':
      return ghGet(`/repos/${GITHUB_ORG}/${repo || 'awp-wallet'}/issues?state=open&per_page=10`);
    case 'releases':
      return ghGet(`/repos/${GITHUB_ORG}/${repo || 'awp-wallet'}/releases?per_page=5`);
    case 'repo':
      return ghGet(`/repos/${GITHUB_ORG}/${repo || 'awp-wallet'}`);
    case 'contributors':
      return ghGet(`/repos/${GITHUB_ORG}/${repo || 'awp-wallet'}/contributors?per_page=10`);
    default: return { error: `Unknown command: ${command}` };
  }
}

// Main dispatcher
export async function executeTool(name, input) {
  try {
    switch (name) {
      case 'awp_api': return await execAwpApi(input);
      case 'benchmark_api': return await execBenchmarkApi(input);
      case 'chain_query': return await execChainQuery(input);
      case 'github_query': return await execGithubQuery(input);
      case 'read_knowledge': return readKnowledge(input.filename);
      default: return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e.message };
  }
}
