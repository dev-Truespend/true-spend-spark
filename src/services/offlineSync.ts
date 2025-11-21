// Offline Sync Service - Bidirectional sync with conflict resolution
import { supabase } from '@/integrations/supabase/client';
import { addToSyncQueue } from '@/lib/db/indexedDB';

export interface SyncConflict {
  table: string;
  recordId: string;
  localData: any;
  remoteData: any;
  localTimestamp: string;
  remoteTimestamp: string;
}

export type ConflictResolution = 'local' | 'remote' | 'manual';

interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: SyncConflict[];
}

class OfflineSyncService {
  private lastSyncTimestamp: Record<string, string> = {};

  /**
   * Pull remote changes to local storage
   */
  async pullChanges(
    table: string,
    localStore: any[],
    onConflict: (conflict: SyncConflict) => Promise<ConflictResolution>
  ): Promise<{ pulled: number; conflicts: SyncConflict[] }> {
    try {
      const lastSync = this.lastSyncTimestamp[table];
      let query = supabase.from(table as any).select('*');

      if (lastSync) {
        query = query.gt('updated_at', lastSync);
      }

      const { data: remoteRecords, error } = await query as { data: any[] | null; error: any };

      if (error) {
        console.error(`[OfflineSync] Error pulling ${table}:`, error);
        throw error;
      }

      if (!remoteRecords || remoteRecords.length === 0) {
        return { pulled: 0, conflicts: [] };
      }

      const conflicts: SyncConflict[] = [];
      let pulledCount = 0;

      for (const remoteRecord of remoteRecords) {
        const localRecord = localStore.find(r => r.id === remoteRecord.id);

        if (!localRecord) {
          // New remote record, add to local
          // This would be handled by the storage adapter
          pulledCount++;
          continue;
        }

        // Check for conflict (both modified since last sync)
        const localModified = new Date(localRecord.updated_at || localRecord.created_at);
        const remoteModified = new Date(remoteRecord.updated_at || remoteRecord.created_at);

        if (localRecord.synced === false && localModified > remoteModified) {
          // Potential conflict
          const conflict: SyncConflict = {
            table,
            recordId: remoteRecord.id,
            localData: localRecord,
            remoteData: remoteRecord,
            localTimestamp: localRecord.updated_at || localRecord.created_at,
            remoteTimestamp: remoteRecord.updated_at || remoteRecord.created_at,
          };

          const resolution = await onConflict(conflict);

          if (resolution === 'remote') {
            // Accept remote version
            pulledCount++;
          } else if (resolution === 'manual') {
            conflicts.push(conflict);
          }
          // 'local' means keep local version (push it later)
        } else {
          // No conflict, accept remote
          pulledCount++;
        }
      }

      // Update last sync timestamp
      this.lastSyncTimestamp[table] = new Date().toISOString();

      return { pulled: pulledCount, conflicts };
    } catch (error) {
      console.error('[OfflineSync] Pull error:', error);
      ErrorHandler.handleSilent(error, 'Offline Sync - Pull');
      throw error;
    }
  }

  /**
   * Push local changes to remote
   */
  async pushChanges(
    table: string,
    localStore: any[]
  ): Promise<number> {
    try {
      const unsyncedRecords = localStore.filter(r => r.synced === false);

      if (unsyncedRecords.length === 0) {
        return 0;
      }

      console.log(`[OfflineSync] Pushing ${unsyncedRecords.length} ${table} records`);

      for (const record of unsyncedRecords) {
        // Add to sync queue for retry handling
        await addToSyncQueue(
          record.id ? 'UPDATE' : 'CREATE',
          table,
          record
        );
      }

      return unsyncedRecords.length;
    } catch (error) {
      console.error('[OfflineSync] Push error:', error);
      ErrorHandler.handleSilent(error, 'Offline Sync - Push');
      throw error;
    }
  }

  /**
   * Perform bidirectional sync
   */
  async sync(
    table: string,
    localStore: any[],
    onConflict: (conflict: SyncConflict) => Promise<ConflictResolution>
  ): Promise<SyncResult> {
    console.log(`[OfflineSync] Starting bidirectional sync for ${table}`);

    try {
      // Push local changes first
      const pushed = await this.pushChanges(table, localStore);

      // Then pull remote changes
      const { pulled, conflicts } = await this.pullChanges(table, localStore, onConflict);

      return { pushed, pulled, conflicts };
    } catch (error) {
      console.error('[OfflineSync] Sync error:', error);
      ErrorHandler.handle(error, 'Offline Sync');
      throw error;
    }
  }

  /**
   * Get last sync timestamp for a table
   */
  getLastSyncTime(table: string): string | null {
    return this.lastSyncTimestamp[table] || null;
  }

  /**
   * Reset sync state (useful for testing)
   */
  resetSyncState() {
    this.lastSyncTimestamp = {};
  }
}

export const offlineSyncService = new OfflineSyncService();
