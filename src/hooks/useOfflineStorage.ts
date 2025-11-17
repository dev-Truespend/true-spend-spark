import { useEffect, useState } from 'react';
import { useNetworkQuality } from './useNetworkQuality';
import { syncManager } from '@/services/syncManager';
import { offlineSyncService, SyncConflict } from '@/services/offlineSync';
import { IndexedDBAdapter } from '@/services/storage/IndexedDBAdapter';

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

  useEffect(() => {
    storage.init();
  }, [storage]);

  useEffect(() => {
    const updateStatus = async () => {
      const syncStatus = syncManager.getStatus();
      const unsyncedTransactions = await storage.query('transactions', (item: any) => !item.synced);
      const unsyncedBudgets = await storage.query('budgets', (item: any) => !item.synced);
      
      setStatus(prev => ({
        ...prev,
        isOnline: quality !== 'offline',
        isSyncing: syncStatus === 'syncing',
        pendingChanges: unsyncedTransactions.length + unsyncedBudgets.length,
      }));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [quality, storage]);

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
