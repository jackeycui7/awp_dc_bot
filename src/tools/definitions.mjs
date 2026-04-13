// Claude tool_use schema definitions
export const tools = [
  {
    name: 'awp_api',
    description: 'Query AWP RootNet via JSON-RPC 2.0 (api.awp.sh/v2) for on-chain protocol data: users, staking, worknets, emission, governance, agents. Use this for protocol-level queries that apply across all worknets.',
    input_schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: [
            // System
            'stats.global', 'registry.get', 'health.check', 'chains.list',
            // Users
            'users.get', 'users.getPortfolio', 'users.getDelegates',
            // Address
            'address.check', 'address.resolveRecipient',
            // Agents
            'agents.getByOwner', 'agents.getDetail', 'agents.lookup',
            // Staking
            'staking.getBalance', 'staking.getUserBalanceGlobal', 'staking.getPositions', 'staking.getPositionsGlobal',
            'staking.getAllocations', 'staking.getAgentSubnetStake', 'staking.getAgentSubnets', 'staking.getSubnetTotalStake',
            // Worknets
            'subnets.list', 'subnets.listRanked', 'subnets.search', 'subnets.get', 'subnets.getSkills',
            'subnets.getEarnings', 'subnets.getAgentInfo', 'subnets.listAgents', 'subnets.getByOwner',
            // Emission
            'emission.getCurrent', 'emission.getSchedule', 'emission.listEpochs', 'emission.getEpochDetail',
            // Tokens
            'tokens.getAWP', 'tokens.getAWPGlobal', 'tokens.getWorknetTokenInfo', 'tokens.getWorknetTokenPrice',
            // Governance
            'governance.listProposals', 'governance.getProposal', 'governance.getTreasury'
          ],
          description: 'JSON-RPC method to call'
        },
        params: {
          type: 'object',
          description: 'Method parameters',
          properties: {
            address: { type: 'string', description: 'Wallet address' },
            owner: { type: 'string', description: 'Owner address' },
            agent: { type: 'string', description: 'Agent address' },
            worknetId: { type: 'string', description: 'Worknet ID (e.g. "845300000002")' },
            chainId: { type: 'number', description: 'Chain ID (8453=Base, 1=Ethereum, 42161=Arbitrum, 56=BSC)' },
            query: { type: 'string', description: 'Search query' },
            status: { type: 'string', enum: ['Active', 'Pending', 'Paused', 'Banned'] },
            page: { type: 'number' },
            limit: { type: 'number' }
          }
        }
      },
      required: ['method']
    }
  },
  {
    name: 'worknet_api',
    description: 'Query a specific WorkNet API for worker/validator status, epoch stats, and network info. Each WorkNet has its own API endpoint. Currently supported: "mine" (Data Mining WorkNet). Use this when a user asks about their status on a specific worknet.',
    input_schema: {
      type: 'object',
      properties: {
        worknet: {
          type: 'string',
          enum: ['mine'],
          description: 'Which worknet to query. "mine" = Data Mining WorkNet (aMine)'
        },
        command: {
          type: 'string',
          enum: [
            'profile',           // Full status: worker + validator + current epoch stats
            'worker',            // Basic worker info
            'worker_epochs',     // Worker epoch history
            'validator_epochs',  // Validator epoch history
            'epoch_snapshot',    // Epoch snapshot (all participants)
            'epoch_settlement',  // Epoch settlement results
            'workers_online',    // List of online workers
            'validators_online', // List of online validators
            'workers_list',      // All workers (paginated)
            'config'             // WorkNet protocol config (thresholds, etc.)
          ],
          description: 'Command to execute'
        },
        address: { type: 'string', description: 'Wallet address (for profile, worker, worker_epochs, validator_epochs)' },
        epoch_id: { type: 'string', description: 'Epoch ID (for epoch_snapshot, epoch_settlement)' }
      },
      required: ['worknet', 'command']
    }
  },
  {
    name: 'chain_query',
    description: 'Query Base blockchain directly via RPC for on-chain balances.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['awp_balance', 'eth_balance', 'total_supply', 'block'],
          description: 'RPC command'
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
          description: 'GitHub command'
        },
        repo: {
          type: 'string',
          enum: ['awp-skill', 'awp-wallet', 'rootnet', 'mine-skill', 'data-mining-platform'],
          description: 'Repository name'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'list_worknets',
    description: 'List all available WorkNets with their IDs, names, and descriptions. Use this when a user asks what worknets are available or wants to know about different work opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        // Dummy param - proxy bug drops content when input is empty {}
        _: { type: 'string', description: 'ignored' }
      },
      required: ['_']
    }
  },
  {
    name: 'read_knowledge',
    description: 'Read a knowledge base file. Use "protocol/" prefix for AWP protocol docs, "worknets/mine/" for Mine WorkNet docs.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Knowledge file path (e.g. "protocol/staking.md", "worknets/mine/overview.md", "faq.md")'
        }
      },
      required: ['path']
    }
  }
];
