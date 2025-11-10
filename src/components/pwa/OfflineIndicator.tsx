import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSync } from '@/hooks/useSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const { pendingCount } = useSync();
  const { performFullSync } = useOfflineSync();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      
      // Auto-sync when coming back online
      if (pendingCount > 0) {
        try {
          await performFullSync();
        } catch (error) {
          console.error('[OfflineIndicator] Auto-sync failed:', error);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCount, performFullSync]);

  if (isOnline && !showOfflineAlert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert variant={isOnline ? 'default' : 'destructive'} className="shadow-lg">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <AlertDescription>
            {isOnline
              ? `Back online! ${pendingCount > 0 ? `Syncing ${pendingCount} items...` : 'All synced.'}`
              : 'You are offline. Changes will sync when connection is restored.'}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}
