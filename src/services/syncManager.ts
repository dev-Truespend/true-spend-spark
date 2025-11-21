// Sync Manager - Handles background sync with exponential backoff retry
import { SyncQueueRecord, addToSyncQueue, getSyncQueue, removeSyncQueueItem, incrementSyncRetries } from '@/lib/db/indexedDB';
import { supabase } from '@/integrations/supabase/client';
import { ErrorHandler } from '@/lib/errors/errorHandler';
import { measureAsync, performanceMonitor } from '@/lib/performance/performanceMonitor';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncManagerConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number;
}

const DEFAULT_CONFIG: SyncManagerConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 16000, // 16 seconds
};

type SyncStatusListener = (status: SyncStatus, error?: string) => void;

class SyncManager {
  private config: SyncManagerConfig;
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncStatusListener> = new Set();
  private syncInterval: number | null = null;
  private isSyncing = false;

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('[SyncManager] Device is online, starting sync');
      this.updateStatus('idle');
      this.startAutoSync();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncManager] Device is offline');
      this.updateStatus('offline');
      this.stopAutoSync();
    });
  }

  private updateStatus(status: SyncStatus, error?: string) {
    this.status = status;
    this.listeners.forEach(listener => listener(status, error));
  }

  public onStatusChange(listener: SyncStatusListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  private calculateDelay(retries: number): number {
    const delay = Math.min(
      this.config.baseDelay * Math.pow(2, retries),
      this.config.maxDelay
    );
    return delay;
  }

  private async processQueueItem(item: SyncQueueRecord): Promise<boolean> {
    return measureAsync(`sync-${item.action}-${item.table}`, async () => {
      try {
        const { action, table, data } = item;
        console.log(`[SyncManager] Processing ${action} on ${table}`, data);

        switch (action) {
          case 'CREATE':
            const { error: createError } = await supabase
              .from(table as any)
              .insert(data);
            if (createError) throw createError;
            break;

          case 'UPDATE':
            const { error: updateError } = await supabase
              .from(table as any)
              .update(data)
              .eq('id', data.id);
            if (updateError) throw updateError;
            break;

          case 'DELETE':
            const { error: deleteError } = await supabase
              .from(table as any)
              .delete()
              .eq('id', data.id);
            if (deleteError) throw deleteError;
            break;
        }

        return true;
      } catch (error) {
        console.error('[SyncManager] Failed to process queue item:', error);
        return false;
      }
    });
  }

  public async sync(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress');
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('[SyncManager] Device offline, skipping sync');
      this.updateStatus('offline');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.updateStatus('syncing');

    try {
      const queue = await getSyncQueue();
      console.log(`[SyncManager] Processing ${queue.length} items`);

      let successCount = 0;
      let failedCount = 0;

      for (const item of queue) {
        const shouldRetry = (item.retries || 0) < this.config.maxRetries;

        if (!shouldRetry) {
          console.warn('[SyncManager] Max retries reached for item:', item);
          await removeSyncQueueItem(item.id!);
          failedCount++;
          continue;
        }

        // Apply exponential backoff delay
        if (item.retries && item.retries > 0) {
          const delay = this.calculateDelay(item.retries);
          console.log(`[SyncManager] Waiting ${delay}ms before retry ${item.retries + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const success = await this.processQueueItem(item);

        if (success) {
          await removeSyncQueueItem(item.id!);
          successCount++;
        } else {
          // Increment retry count for this item
          const maxRetries = 5;
          if (item.retries >= maxRetries) {
            console.error(`[SyncManager] Max retries (${maxRetries}) exceeded for item ${item.id}, moving to failed state`);
            // Remove from queue - exceeded max retries
            await removeSyncQueueItem(item.id!);
            failedCount++;
          } else {
            // Increment retry count on the existing item
            await incrementSyncRetries(item.id!);
            console.log(`[SyncManager] Item ${item.id} retry count: ${item.retries + 1}/${maxRetries}`);
          }
        }
      }

      console.log(`[SyncManager] Sync complete: ${successCount} success, ${failedCount} failed`);
      this.updateStatus('idle');
      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('[SyncManager] Sync error:', error);
      ErrorHandler.handle(error, 'Sync Manager');
      this.updateStatus('error', error instanceof Error ? error.message : 'Unknown error');
      return { success: 0, failed: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  public startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      console.log('[SyncManager] Auto-sync already running');
      return;
    }

    console.log(`[SyncManager] Starting auto-sync (every ${intervalMs}ms)`);
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, intervalMs);

    // Run initial sync
    if (navigator.onLine) {
      this.sync();
    }
  }

  public stopAutoSync() {
    if (this.syncInterval) {
      console.log('[SyncManager] Stopping auto-sync');
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const syncManager = new SyncManager();
