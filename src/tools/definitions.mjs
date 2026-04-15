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
            'staking.getPending', 'staking.getFrozen',
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
    description: 'Query a specific WorkNet API for worker/validator/agent status, epoch stats, and network info. Each WorkNet has its own API. Use this when a user asks about their status on a specific worknet. Mine WorkNet has miners/validators; Predict WorkNet has agents predicting price direction.',
    input_schema: {
      type: 'object',
      properties: {
        worknet: {
          type: 'string',
          enum: ['mine', 'predict'],
          description: 'Which worknet to query. "mine" = Data Mining WorkNet (aMine). "predict" = Predict WorkNet (aPRED, crypto price prediction).'
        },
        command: {
          type: 'string',
          enum: [
            // Mine WorkNet commands (worknet=mine)
            'profile',              // Mine: miner+validator profile / Predict: agent profile
            'worker',               // Mine only: basic miner info
            'worker_epochs',        // Mine only: miner epoch history
            'validator_epochs',     // Mine only: validator epoch history
            'epoch_snapshot',       // Both: snapshot for an epoch
            'epoch_settlement',     // Mine only: epoch settlement results
            'workers_online',       // Mine only: online miners list
            'validators_online',    // Mine only: online validators
            'workers_list',         // Mine only: all miners
            'config',               // Mine only: protocol config
            'network_stats',        // Both: network-level stats
            'protocol_info',        // Mine only: min stake, chain id
            'datasets',             // Mine only: active datasets
            'current_epoch',        // Both: current epoch window
            // Predict WorkNet commands (worknet=predict)
            'agent_predictions',    // Predict: agent's prediction history
            'agent_equity_curve',   // Predict: agent's balance curve
            'feed_live',            // Predict: live prediction feed
            'leaderboard',          // Predict: agent rankings
            'leaderboard_live',     // Predict: real-time rankings
            'markets_active',       // Predict: open markets
            'markets_resolved',     // Predict: settled markets
            'market_detail'         // Predict: single market info
          ],
          description: 'Command to execute (commands are worknet-specific — see comments)'
        },
        address: { type: 'string', description: 'Wallet address' },
        epoch_id: { type: 'string', description: 'Epoch ID' },
        market_id: { type: 'string', description: 'Market ID (Predict WorkNet only)' }
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
          enum: ['issues', 'releases', 'tags', 'latest_version', 'repo', 'contributors'],
          description: 'GitHub command. Use latest_version to get the most recent version (checks releases first, then tags)'
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
