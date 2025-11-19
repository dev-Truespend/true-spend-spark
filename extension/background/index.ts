import { handleAuth } from './auth';
import { telemetry } from './telemetry';
import { featureFlags } from './feature-flags';

// Service Workers are EPHEMERAL in Manifest V3 (30s timeout)
// Use chrome.alarms for persistent tasks

console.log('[TrueSpend Extension] Background service worker started');

// Initialize services
featureFlags.initialize().then(() => {
  console.log('[Background] Feature flags initialized');
});

// Track extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    telemetry.track('extension_installed', {
      version: chrome.runtime.getManifest().version,
    });
  } else if (details.reason === 'update') {
    telemetry.track('extension_updated', {
      version: chrome.runtime.getManifest().version,
      previous_version: details.previousVersion,
    });
  }
});

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type);

  if (message.type === 'AUTH_REQUEST') {
    handleAuth().then(sendResponse).catch(error => {
      console.error('[Background] Auth error:', error);
      sendResponse({ error: error.message });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'TRACK_BUDGET') {
    trackBudgetEvent(message.data).then(sendResponse).catch(error => {
      console.error('[Background] Track budget error:', error);
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (message.type === 'MERCHANT_DETECTED') {
    handleMerchantDetection(message.data).then(sendResponse).catch(error => {
      console.error('[Background] Merchant detection error:', error);
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (message.type === 'AUTH_EXPIRED') {
    // Clear session and notify user
    chrome.storage.local.remove('session');
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    sendResponse({ success: true });
    return true;
  }
});

async function trackBudgetEvent(data: any) {
  try {
    const result = await chrome.storage.local.get('session');
    const session = result.session;

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extension-telemetry`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: [{
            event: 'budget_viewed',
            properties: data,
            timestamp: Date.now(),
          }]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[Background] Track budget event failed:', error);
    throw error;
  }
}

async function handleMerchantDetection(data: any) {
  console.log('[Background] Merchant detected:', data);
  
  // Track in telemetry
  telemetry.track('merchant_detected', {
    merchant: data.merchant,
    has_price: !!data.price,
    url: data.url,
  });
  
  // Store detection for analytics
  const detections = await chrome.storage.local.get('merchantDetections') || { merchantDetections: [] };
  const updated = [...(detections.merchantDetections || []), data].slice(-100); // Keep last 100
  
  await chrome.storage.local.set({ merchantDetections: updated });

  return { success: true };
}

// Periodic cache refresh (survives service worker restarts)
chrome.alarms.create('cache-refresh', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[Background] Alarm triggered:', alarm.name);

  if (alarm.name === 'cache-refresh') {
    await refreshBudgetCache();
  }
});

async function refreshBudgetCache() {
  try {
    const result = await chrome.storage.local.get('session');
    const session = result.session;

    if (!session?.access_token) {
      console.log('[Background] No session, skipping cache refresh');
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/budgets?select=*&order=created_at.desc`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );

    if (response.ok) {
      const budgets = await response.json();
      await chrome.storage.local.set({ cachedBudgets: budgets, lastCacheRefresh: Date.now() });
      console.log('[Background] Budget cache refreshed:', budgets.length, 'budgets');
    }
  } catch (error) {
    console.error('[Background] Cache refresh failed:', error);
  }
}

// Badge updates on budget threshold
async function setupRealtimeSubscription() {
  try {
    const result = await chrome.storage.local.get('session');
    const session = result.session;

    if (!session?.access_token) {
      console.log('[Background] No session, skipping realtime setup');
      return;
    }

    // Note: Realtime subscriptions require persistent connection
    // Will be implemented in Week 2 with proper WebSocket handling
    console.log('[Background] Realtime subscriptions to be implemented in Week 2');
  } catch (error) {
    console.error('[Background] Realtime setup failed:', error);
  }
}

// Initialize on service worker startup
setupRealtimeSubscription();
