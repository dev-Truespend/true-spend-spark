// Feature flags service for remote configuration and A/B testing

export class FeatureFlagService {
  private flags: Record<string, boolean> = {};
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    // Load cached flags from storage
    const result = await chrome.storage.local.get('featureFlags');
    if (result.featureFlags) {
      this.flags = result.featureFlags;
      console.log('[FeatureFlags] Loaded cached flags:', this.flags);
    }

    // Refresh from server
    await this.refresh();

    // Set up periodic refresh
    chrome.alarms.create('flags-refresh', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'flags-refresh') {
        this.refresh();
      }
    });

    this.initialized = true;
  }

  async refresh() {
    try {
      const session = await chrome.storage.local.get('session');
      
      if (!session.session?.access_token) {
        console.log('[FeatureFlags] No session, skipping refresh');
        return;
      }

      console.log('[FeatureFlags] Refreshing from server');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feature-flag-evaluator`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            environment: 'extension',
            context: {
              version: chrome.runtime.getManifest().version,
              platform: 'chrome',
            }
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.flags = data.flags || {};
        
        // Cache flags in storage
        await chrome.storage.local.set({ featureFlags: this.flags });
        console.log('[FeatureFlags] Refreshed flags:', this.flags);
      } else {
        console.error('[FeatureFlags] Refresh failed:', response.status);
      }
    } catch (error) {
      console.error('[FeatureFlags] Refresh error:', error);
    }
  }

  isEnabled(flagName: string): boolean {
    const enabled = this.flags[flagName] || false;
    console.log(`[FeatureFlags] ${flagName}:`, enabled);
    return enabled;
  }

  getFlags(): Record<string, boolean> {
    return { ...this.flags };
  }

  // For debugging
  async forceRefresh() {
    await this.refresh();
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagService();
