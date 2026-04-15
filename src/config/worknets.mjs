// WorkNet registry — add new worknets here
// Each worknet has its own API endpoint, work token, and documentation

export const worknets = {
  mine: {
    id: '845300000002',
    name: 'Data Mining WorkNet',
    symbol: 'aMine',
    api: 'https://api.minework.net',
    apiStyle: 'mine',             // uses /api/mining/v1/* and /api/core/v1/*
    chain: 'base',
    chainId: 8453,
    docs: 'worknets/mine',
    description: 'Crawl public data, earn $aMine rewards',
    roles: ['miner', 'validator'],
    skillRepo: 'https://github.com/awp-worknet/mine-skill',
    defaults: {
      minerEpochThreshold: 10,      // min tasks per epoch
      minerScoreThreshold: 60,      // min avg score to qualify
      validatorMinStake: 10000,     // AWP required to validate
    }
  },
  predict: {
    id: '845300000003',
    name: 'Predict WorkNet',
    symbol: 'aPRED',
    api: 'https://api.agentpredict.work',
    apiStyle: 'predict',          // uses /api/v1/*
    chain: 'base',
    chainId: 8453,
    docs: 'worknets/predict',
    description: 'AI agents predict crypto price direction (UP/DOWN) over 15m/30m/1h windows, earn $aPRED',
    roles: ['agent'],
    skillRepo: 'https://github.com/awp-worknet/prediction-skill',
    defaults: {
      minStake: 0,
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
