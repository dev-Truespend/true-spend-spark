import { addToSyncQueue, getSyncQueue, removeSyncQueueItem, incrementSyncRetries, SyncQueueRecord } from '@/lib/db/indexedDB';
import { supabase } from '@/integrations/supabase/client';

export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'error';

// Extend ServiceWorkerRegistration to include sync
interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync: SyncManager;
}

const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second

class SyncManager {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.setupNetworkListeners();
    this.setupServiceWorkerListener();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private setupServiceWorkerListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'BACKGROUND_SYNC') {
          this.processSyncQueue();
        }
      });
    }
  }

  async queueAction(action: SyncAction, table: string, data: any): Promise<void> {
    try {
      await addToSyncQueue(action, table, data);
      console.log('[SyncManager] Action queued:', { action, table });
      
      // Try immediate sync if online
      if (this.isOnline) {
        await this.triggerSync();
      }
    } catch (error) {
      console.error('[SyncManager] Failed to queue action:', error);
      throw error;
    }
  }

  async triggerSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[SyncManager] Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      console.log('[SyncManager] Cannot sync: offline');
      return;
    }

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready as ExtendedServiceWorkerRegistration;
        await registration.sync.register('sync-pending-actions');
        console.log('[SyncManager] Background sync registered');
      } catch (error) {
        console.error('[SyncManager] Background sync registration failed:', error);
        // Fallback to immediate sync
        await this.processSyncQueue();
      }
    } else {
      // Fallback for browsers without background sync
      await this.processSyncQueue();
    }
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    this.notifyListeners('syncing');

    try {
      const queue = await getSyncQueue();
      console.log(`[SyncManager] Processing ${queue.length} items`);

      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          await removeSyncQueueItem(item.id!);
        } catch (error) {
          console.error('[SyncManager] Failed to process item:', error);
          
          if (item.retries < MAX_RETRIES) {
            await incrementSyncRetries(item.id!);
            // Exponential backoff: wait before next retry
            const delay = this.calculateBackoff(item.retries);
            console.log(`[SyncManager] Will retry in ${delay}ms`);
          } else {
            console.error('[SyncManager] Max retries reached, removing item');
            await removeSyncQueueItem(item.id!);
          }
        }
      }

      this.notifyListeners('success');
    } catch (error) {
      console.error('[SyncManager] Sync queue processing failed:', error);
      this.notifyListeners('error');
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncItem(item: SyncQueueRecord): Promise<void> {
    const { action, table, data } = item;

    switch (action) {
      case 'CREATE':
        await supabase.from(table as any).insert(data);
        break;
      case 'UPDATE':
        await supabase.from(table as any).update(data).eq('id', data.id);
        break;
      case 'DELETE':
        await supabase.from(table as any).delete().eq('id', data.id);
        break;
    }

    console.log(`[SyncManager] Successfully synced ${action} on ${table}`);
  }

  private calculateBackoff(retries: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return BASE_DELAY * Math.pow(2, retries);
  }

  addListener(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(callback => callback(status));
  }

  async getPendingCount(): Promise<number> {
    const queue = await getSyncQueue();
    return queue.length;
  }

  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

// Singleton instance
export const syncManager = new SyncManager();
