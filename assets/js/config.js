/*
  PARADOX ANTICHEAT deployment configuration.

  For Cloudflare deployment, set apiBaseUrl to your Worker/custom API hostname,
  for example: https://api.example.com

  Leave it blank when the dashboard and Worker API share the same origin.
*/
window.PARADOX_CONFIG = {
  apiBaseUrl: 'https://paradox-anticheat-api.nickthequick1806.workers.dev',
  documentationUrl: 'https://paradox-12.gitbook.io/paradox-anticheat',
  testAccount: {
    email: 'demo@paradox-anticheat.local',
    password: 'ParadoxTest!2026'
  }
};
