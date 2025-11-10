import { useEffect, useState } from 'react';
import { offlineSyncService, ConflictResolution } from '@/services/offlineSync';
import { useAuth } from './useAuth';

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

export function useOfflineSync() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineSyncService.addSyncListener((result) => {
      setLastSyncResult(result);
      setConflicts(offlineSyncService.getConflicts());
    });

    // Load initial conflicts
    setConflicts(offlineSyncService.getConflicts());

    return unsubscribe;
  }, []);

  const performFullSync = async () => {
    if (!user) {
      console.warn('[useOfflineSync] No user, skipping sync');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await offlineSyncService.fullSync(user.id);
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToRemote = async () => {
    setIsSyncing(true);
    try {
      const result = await offlineSyncService.syncToRemote();
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromRemote = async () => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const result = await offlineSyncService.syncFromRemote(user.id);
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  const resolveConflict = async (
    conflict: SyncConflict,
    resolution: ConflictResolution,
    manualData?: any
  ) => {
    await offlineSyncService.resolveConflict(conflict, resolution, manualData);
    setConflicts(offlineSyncService.getConflicts());
  };

  return {
    conflicts,
    lastSyncResult,
    isSyncing,
    performFullSync,
    syncToRemote,
    syncFromRemote,
    resolveConflict,
  };
}
