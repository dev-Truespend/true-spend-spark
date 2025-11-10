import { supabase } from '@/integrations/supabase/client';
import { 
  getAllItems, 
  updateItem, 
  getUnsyncedItems, 
  addToSyncQueue 
} from '@/lib/db/indexedDB';
import { syncManager } from './syncManager';

export type ConflictResolution = 'local' | 'remote' | 'manual';

interface SyncConflict {
  localData: any;
  remoteData: any;
  table: string;
  id: string;
}

interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  synced: number;
  failed: number;
}

class OfflineSyncService {
  private conflictQueue: SyncConflict[] = [];
  private syncListeners: Set<(result: SyncResult) => void> = new Set();

  /**
   * Sync local unsynced data to Supabase
   */
  async syncToRemote(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      conflicts: [],
      synced: 0,
      failed: 0,
    };

    try {
      // Sync transactions
      await this.syncTable('transactions', result);
      
      // Sync budgets
      await this.syncTable('budgets', result);
      
      // Sync geofences
      await this.syncTable('geofences', result);

      // Process sync queue through syncManager
      await syncManager.processSyncQueue();

    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      result.success = false;
    }

    this.notifySyncListeners(result);
    return result;
  }

  /**
   * Pull remote data and merge with local
   */
  async syncFromRemote(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      conflicts: [],
      synced: 0,
      failed: 0,
    };

    try {
      // Pull transactions
      await this.pullAndMerge('transactions', userId, result);
      
      // Pull budgets
      await this.pullAndMerge('budgets', userId, result);
      
      // Pull geofences
      await this.pullAndMerge('geofences', userId, result);

    } catch (error) {
      console.error('[OfflineSync] Pull failed:', error);
      result.success = false;
    }

    this.notifySyncListeners(result);
    return result;
  }

  /**
   * Full bidirectional sync
   */
  async fullSync(userId: string): Promise<SyncResult> {
    // First push local changes
    const pushResult = await this.syncToRemote();
    
    // Then pull remote changes
    const pullResult = await this.syncFromRemote(userId);

    return {
      success: pushResult.success && pullResult.success,
      conflicts: [...pushResult.conflicts, ...pullResult.conflicts],
      synced: pushResult.synced + pullResult.synced,
      failed: pushResult.failed + pullResult.failed,
    };
  }

  private async syncTable(table: string, result: SyncResult): Promise<void> {
    try {
      const unsynced = await getUnsyncedItems(table as any);
      
      for (const item of unsynced) {
        try {
          const { error } = await supabase
            .from(table as any)
            .upsert({ ...item, synced: true });

          if (error) throw error;

          // Update local record as synced
          await updateItem(table as any, { ...item, synced: true });
          result.synced++;
        } catch (error) {
          console.error(`[OfflineSync] Failed to sync ${table}:`, error);
          result.failed++;
        }
      }
    } catch (error) {
      console.error(`[OfflineSync] Table sync error for ${table}:`, error);
      result.failed++;
    }
  }

  private async pullAndMerge(
    table: string, 
    userId: string, 
    result: SyncResult
  ): Promise<void> {
    try {
      // Get remote data with proper type casting
      const response = await supabase
        .from(table as any)
        .select('*')
        .eq('user_id', userId);

      if (response.error) throw response.error;
      const remoteData = response.data || [];

      // Get local data
      const localData = await getAllItems(table as any);
      const localMap = new Map(localData.map(item => [item.id, item]));

      for (const remoteItem of remoteData) {
        if (!remoteItem || typeof remoteItem !== 'object') continue;
        
        const localItem = localMap.get((remoteItem as any).id);

        if (!localItem) {
          // New remote item, add to local
          await updateItem(table as any, { ...remoteItem as any, synced: true });
          result.synced++;
        } else if (localItem.synced) {
          // Both synced, use remote (it's newer)
          if (this.hasChanged(localItem, remoteItem)) {
            await updateItem(table as any, { ...remoteItem as any, synced: true });
            result.synced++;
          }
        } else {
          // Local has unsynced changes - conflict!
          const conflict: SyncConflict = {
            localData: localItem,
            remoteData: remoteItem,
            table,
            id: (remoteItem as any).id,
          };
          
          result.conflicts.push(conflict);
          this.conflictQueue.push(conflict);
        }
      }
    } catch (error) {
      console.error(`[OfflineSync] Pull failed for ${table}:`, error);
      result.failed++;
    }
  }

  private hasChanged(local: any, remote: any): boolean {
    // Simple change detection based on updated_at or created_at
    const localTime = new Date(local.updated_at || local.created_at).getTime();
    const remoteTime = new Date(remote.updated_at || remote.created_at).getTime();
    return remoteTime > localTime;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflict: SyncConflict,
    resolution: ConflictResolution,
    manualData?: any
  ): Promise<void> {
    let resolvedData: any;

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localData;
        break;
      case 'remote':
        resolvedData = conflict.remoteData;
        break;
      case 'manual':
        if (!manualData) throw new Error('Manual data required');
        resolvedData = manualData;
        break;
    }

    // Update both local and remote
    await updateItem(conflict.table as any, { ...resolvedData, synced: true });
    await supabase
      .from(conflict.table as any)
      .upsert(resolvedData);

    // Remove from conflict queue
    this.conflictQueue = this.conflictQueue.filter(
      c => !(c.id === conflict.id && c.table === conflict.table)
    );
  }

  /**
   * Get pending conflicts
   */
  getConflicts(): SyncConflict[] {
    return [...this.conflictQueue];
  }

  addSyncListener(callback: (result: SyncResult) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  private notifySyncListeners(result: SyncResult) {
    this.syncListeners.forEach(callback => callback(result));
  }
}

export const offlineSyncService = new OfflineSyncService();
