// Telemetry service for batched analytics
// Batches events and sends every 15 minutes via alarm

interface TelemetryEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  extension_version: string;
}

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly FLUSH_INTERVAL = 15; // minutes

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Create alarm for periodic flush
    chrome.alarms.create('telemetry-flush', { 
      periodInMinutes: this.FLUSH_INTERVAL 
    });

    // Listen for alarm
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'telemetry-flush') {
        this.flush();
      }
    });

    // Load queue from storage on startup
    const result = await chrome.storage.local.get('telemetryQueue');
    if (result.telemetryQueue) {
      this.queue = result.telemetryQueue;
    }
  }

  async track(event: string, properties: Record<string, any> = {}) {
    // Check if telemetry is enabled
    const settings = await chrome.storage.local.get('settings');
    if (settings.settings?.telemetryEnabled === false) {
      return; // Telemetry disabled by user
    }

    const telemetryEvent: TelemetryEvent = {
      event,
      properties,
      timestamp: Date.now(),
      extension_version: chrome.runtime.getManifest().version,
    };

    this.queue.push(telemetryEvent);
    console.log('[Telemetry] Event tracked:', event);

    // Save queue to storage (survives service worker restarts)
    await chrome.storage.local.set({ telemetryQueue: this.queue });

    // Flush if queue is full
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      await this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) {
      console.log('[Telemetry] Nothing to flush');
      return;
    }

    const batch = [...this.queue];
    console.log('[Telemetry] Flushing', batch.length, 'events');

    try {
      const session = await chrome.storage.local.get('session');
      
      if (!session.session?.access_token) {
        console.log('[Telemetry] No session, skipping flush');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extension-telemetry`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events: batch }),
        }
      );

      if (response.ok) {
        // Clear queue on success
        this.queue = [];
        await chrome.storage.local.set({ telemetryQueue: [] });
        console.log('[Telemetry] Flush successful');
      } else {
        console.error('[Telemetry] Flush failed:', response.status);
        // Keep events in queue for retry
      }
    } catch (error) {
      console.error('[Telemetry] Flush error:', error);
      // Re-queue events on failure
      this.queue.unshift(...batch);
      
      // Limit queue size to prevent unbounded growth
      if (this.queue.length > this.MAX_QUEUE_SIZE * 2) {
        this.queue = this.queue.slice(-this.MAX_QUEUE_SIZE);
      }
      
      await chrome.storage.local.set({ telemetryQueue: this.queue });
    }
  }

  // Force immediate flush (e.g., on extension unload)
  async flushImmediate() {
    await this.flush();
  }
}

// Export singleton instance
export const telemetry = new TelemetryService();
