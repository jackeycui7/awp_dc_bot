module.exports = {
  apps: [{
    name: 'awp-discord-bot',
    script: 'src/index.mjs',
    cwd: '/root/awp-discord-bot',
    env: {
      NODE_ENV: 'production'
    },
    max_restarts: 10,
    restart_delay: 5000,
    exp_backoff_restart_delay: 1000,
  }]
};
