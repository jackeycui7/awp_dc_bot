// WorkNet registry — add new worknets here
// Each worknet has its own API endpoint, work token, and documentation

export const worknets = {
  mine: {
    id: '845300000002',
    name: 'Data Mining WorkNet',
    symbol: 'aMine',
    api: 'https://api.minework.net',
    chain: 'base',
    chainId: 8453,
    docs: 'worknets/mine',
    description: 'Crawl public data, earn $aMine rewards',
    roles: ['miner', 'validator'],
    // WorkNet-specific thresholds (fetch from API for latest values)
    defaults: {
      minerEpochThreshold: 80,      // min submissions per epoch
      minerScoreThreshold: 60,      // min avg score to qualify
      validatorMinStake: 10000,     // AWP required to validate
    }
  },
  // Template for new worknets:
  // inference: {
  //   id: '845300000003',
  //   name: 'Inference WorkNet',
  //   symbol: 'aInf',
  //   api: 'https://api.inference.awp.sh',
  //   chain: 'base',
  //   chainId: 8453,
  //   docs: 'worknets/inference',
  //   description: 'Run AI inference tasks, earn $aInf rewards',
  //   roles: ['worker', 'validator'],
  //   defaults: {}
  // },
};

// Get worknet by ID or name
export function getWorknet(idOrName) {
  if (!idOrName) return null;
  const key = idOrName.toLowerCase();

  // Direct key match
  if (worknets[key]) return { key, ...worknets[key] };

  // Match by ID
  for (const [k, v] of Object.entries(worknets)) {
    if (v.id === idOrName) return { key: k, ...v };
  }

  // Match by name (fuzzy)
  for (const [k, v] of Object.entries(worknets)) {
    if (v.name.toLowerCase().includes(key) || v.symbol.toLowerCase() === key) {
      return { key: k, ...v };
    }
  }

  return null;
}

// List all active worknets
export function listWorknets() {
  return Object.entries(worknets).map(([key, v]) => ({
    key,
    id: v.id,
    name: v.name,
    symbol: v.symbol,
    description: v.description
  }));
}

// Get worknet API base URL
export function getWorknetApi(worknetKey) {
  const wn = worknets[worknetKey];
  return wn ? wn.api : null;
}
