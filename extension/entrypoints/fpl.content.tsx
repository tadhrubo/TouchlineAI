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
      onClick={() => alert('Draft read from local state! Sending to Touchline AI...')}
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
      ⚡ Sync to Touchline Planner
    </button>
  );
}
