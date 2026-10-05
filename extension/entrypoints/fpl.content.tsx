import React from 'react';
import { createRoot } from 'react-dom/client';

export default defineContentScript({
  matches: ['*://*.premierleague.com/*'],
  main(ctx) {
    const observer = new MutationObserver(() => {
      // Look for the primary navigation header on the FPL site
      const header = document.querySelector('.ism-header') || document.querySelector('header');
      
      if (header && !document.getElementById('touchline-sync-wrapper')) {
        injectSyncButton(header);
      }
    });
    
    // Observe DOM changes (since FPL is a React SPA)
    observer.observe(document.body, { childList: true, subtree: true });
  },
});

function injectSyncButton(container: Element) {
  const wrapper = document.createElement('div');
  wrapper.id = 'touchline-sync-wrapper';
  wrapper.style.cssText = 'margin-left: auto; padding: 10px 20px; display: flex; z-index: 9999;';
  
  container.appendChild(wrapper);

  const root = createRoot(wrapper);
  root.render(
    <button 
      onClick={handleSync}
      style={{ 
        background: '#00ff87', // FPL's vibrant green
        color: '#37003c', // FPL's deep purple
        padding: '8px 16px', 
        borderRadius: '8px', 
        fontWeight: 'bold', 
        cursor: 'pointer',
        border: 'none',
        boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
      }}
    >
      <span id="touchline-sync-text">⚡ Sync to Touchline Planner</span>
    </button>
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
