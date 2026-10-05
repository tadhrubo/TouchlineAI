import React from 'react';
import { createRoot } from 'react-dom/client';

export default defineContentScript({
  matches: ['*://*.premierleague.com/*'],
  main() {
    console.log('⚡ Touchline AI Content Script Running');

    const ensureWidgetExists = () => {
      // If the body doesn't exist yet, wait.
      if (!document.body) return;

      // If our widget is already there, do nothing.
      if (document.getElementById('touchline-floating-root')) return;

      // Otherwise, (re)create and inject it
      const host = document.createElement('div');
      host.id = 'touchline-floating-root';
      document.body.appendChild(host);

      const root = createRoot(host);
      root.render(<SyncWidget />);
    };

    // 1. Try to inject immediately
    ensureWidgetExists();

    // 2. Set up an observer to stubbornly keep it alive against React hydration
    const observer = new MutationObserver(() => {
      ensureWidgetExists();
    });

    // 3. Observe the whole document for changes
    observer.observe(document.documentElement, { childList: true, subtree: true });
  },
});

function SyncWidget() {
  return (
    <div
      id="touchline-sync-wrapper"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999999,
      }}
    >
      <button
        onClick={handleSync}
        style={{
          background: '#00ff87', // FPL's vibrant green
          color: '#37003c', // FPL's deep purple
          padding: '10px 18px',
          borderRadius: '24px',
          fontWeight: 'bold',
          fontSize: '14px',
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <span id="touchline-sync-text">⚡ Sync to Touchline Planner</span>
      </button>
    </div>
  );
}

async function handleSync() {
  try {
    const statusText = document.getElementById('touchline-sync-text');
    if (statusText) statusText.innerText = 'Syncing...';

    // 1. Fetch the logged-in user's profile to get their Manager ID
    const meRes = await fetch('https://fantasy.premierleague.com/api/me/');
    const meData = await meRes.json();
    const managerId = meData.player?.entry || meData.entry;

    if (!managerId) throw new Error('Could not find Manager ID. Are you logged in?');

    // 2. Fetch their active draft / picks using the Manager ID
    const teamRes = await fetch(`https://fantasy.premierleague.com/api/my-team/${managerId}/`);
    const teamData = await teamRes.json();

    // 3. POST the payload to the Touchline AI backend
    const syncRes = await fetch('https://touchlineai.site/api/drafts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manager_id: managerId,
        gw: teamData.current_event || 0, // Fallback if API omits it
        picks: teamData.picks,
      }),
    });

    if (syncRes.ok) {
      if (statusText) statusText.innerText = '✅ Draft Synced!';
      setTimeout(() => {
        if (statusText) statusText.innerText = '⚡ Sync to Touchline Planner';
      }, 3000);
    } else {
      throw new Error('Failed to sync to Touchline backend');
    }
  } catch (error) {
    console.error('Touchline Sync Error:', error);
    alert('Failed to sync draft. Are you logged into FPL?');
    const statusText = document.getElementById('touchline-sync-text');
    if (statusText) statusText.innerText = '❌ Sync Failed';
  }
}
