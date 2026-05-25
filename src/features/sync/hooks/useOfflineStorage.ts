import { useEffect, useState } from 'react';
import { useNetworkQuality } from './useNetworkQuality';
import { syncManager } from '@/features/sync/services/syncManager';
import { offlineSyncService, SyncConflict } from '@/features/sync/services/offlineSync';
import { IndexedDBAdapter } from '@/features/sync/services/storage/IndexedDBAdapter';

export interface OfflineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncTime: Date | null;
  conflicts: SyncConflict[];
}

export function useOfflineStorage() {
  const { quality } = useNetworkQuality();
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: quality !== 'offline',
    isSyncing: false,
    pendingChanges: 0,
    lastSyncTime: null,
    conflicts: [],
  });

  const [storage] = useState(() => new IndexedDBAdapter({
    name: 'truespend-offline',
    version: 1,
    stores: ['transactions', 'budgets', 'geofences', 'syncQueue', 'settings'],
  }));
  
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initStorage = async () => {
      try {
        await storage.init();
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[useOfflineStorage] Failed to initialize:', error);
      }
    };
    
    initStorage();
    
    return () => {
      mounted = false;
    };
  }, [storage]);

  useEffect(() => {
    if (!isInitialized) return;
    
    let mounted = true;
    
    const updateStatus = async () => {
      if (!mounted || !storage.isActive()) return;
      
      try {
        const syncStatus = syncManager.getStatus();
        const unsyncedTransactions = await storage.query('transactions', (item: any) => !item.synced);
        const unsyncedBudgets = await storage.query('budgets', (item: any) => !item.synced);
        
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            isOnline: quality !== 'offline',
            isSyncing: syncStatus === 'syncing',
            pendingChanges: unsyncedTransactions.length + unsyncedBudgets.length,
          }));
        }
      } catch (error) {
        if (mounted && error instanceof Error && !error.message.includes('closing')) {
          console.error('[useOfflineStorage] Failed to update status:', error);
        }
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      // Don't close the shared DB - it should stay open for other consumers
    };
  }, [quality, storage, isInitialized]);

  const saveOffline = async <T extends { id?: string }>(
    storeName: string,
    data: T,
    operation: 'CREATE' | 'UPDATE' | 'DELETE'
  ): Promise<string> => {
    const id = data.id || crypto.randomUUID();
    const record = {
      ...data,
      id,
      synced: false,
      updated_at: new Date().toISOString(),
    };

    await storage.set(storeName, id, record);
    await syncManager.sync();
    
    return id;
  };

  const resolveConflict = async (
    conflict: SyncConflict,
    resolution: 'local' | 'remote'
  ) => {
    if (resolution === 'local') {
      // Push local version
      await storage.set(conflict.table, conflict.recordId, conflict.localData);
    } else {
      // Accept remote version
      await storage.set(conflict.table, conflict.recordId, conflict.remoteData);
    }
    
    setStatus(prev => ({
      ...prev,
      conflicts: prev.conflicts.filter(c => c.recordId !== conflict.recordId),
    }));
  };

  return {
    status,
    storage,
    saveOffline,
    resolveConflict,
  };
}
