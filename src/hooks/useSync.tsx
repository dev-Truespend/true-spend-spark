import { useEffect, useState } from 'react';
import { syncManager, SyncStatus, SyncAction } from '@/services/syncManager';

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('pending');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.addListener((status) => {
      setSyncStatus(status);
      updatePendingCount();
    });

    // Subscribe to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    updatePendingCount();

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    const count = await syncManager.getPendingCount();
    setPendingCount(count);
  };

  const queueAction = async (action: SyncAction, table: string, data: any) => {
    await syncManager.queueAction(action, table, data);
    await updatePendingCount();
  };

  const triggerManualSync = async () => {
    await syncManager.triggerSync();
  };

  return {
    syncStatus,
    pendingCount,
    isOnline,
    isSyncing: syncManager.isSyncing(),
    queueAction,
    triggerManualSync,
  };
}
