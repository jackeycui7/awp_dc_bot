// Claude tool_use schema definitions
export const tools = [
  {
    name: 'awp_api',
    description: 'Query AWP RootNet API (https://tapi.awp.sh) for on-chain and platform data.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['health', 'registry', 'user', 'balance', 'subnets', 'subnet', 'emission', 'awp_price', 'proposals', 'treasury', 'staking_positions', 'staking_balance'],
          description: 'API command to execute'
        },
        address: { type: 'string', description: 'Wallet address (for user/balance/staking commands)' },
        subnet_id: { type: 'string', description: 'Subnet ID (for subnet command)' },
        status: { type: 'string', enum: ['Active', 'Pending', 'Paused'], description: 'Filter for subnets command' }
      },
      required: ['command']
    }
  },
  {
    name: 'benchmark_api',
    description: 'Query Benchmark subnet API (https://tapis1.awp.sh) for worker scores, leaderboard, and network stats.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['stats', 'leaderboard', 'worker', 'claims', 'epoch', 'benchmark_sets'],
          description: 'API command to execute'
        },
        address: { type: 'string', description: 'Worker address (for worker/claims commands)' },
        date: { type: 'string', description: 'Date string for claims (e.g. 2025-04-01)' }
      },
      required: ['command']
    }
  },
  {
    name: 'chain_query',
    description: 'Query BSC blockchain directly via RPC for on-chain balances and contract state.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['awp_balance', 'eth_balance', 'total_supply', 'block'],
          description: 'RPC command to execute'
        },
        address: { type: 'string', description: 'Address to query' }
      },
      required: ['command']
    }
  },
  {
    name: 'github_query',
    description: 'Query AWP GitHub repositories for issues, releases, and activity.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['issues', 'releases', 'repo', 'contributors'],
          description: 'GitHub command to execute'
        },
        repo: { type: 'string', description: 'Repository name (e.g. awp-wallet, subnet-benchmark)' }
      },
      required: ['command']
    }
  },
  {
    name: 'read_knowledge',
    description: 'Read a knowledge base file for detailed information about AWP topics. Use this when you need specific documentation to answer a question.',
    input_schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Knowledge file to read (e.g. "13-faq.md", "error-index.md")'
        }
      },
      required: ['filename']
    }
  }
];
