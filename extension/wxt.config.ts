import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Touchline AI: FPL Analytics',
    description: 'Inline xGI stats and one-click Touchline AI planner sync.',
    permissions: ['storage'],
    host_permissions: [
      'https://fantasy.premierleague.com/*',
      'https://touchlineai.site/*',
    ],
  },
});
