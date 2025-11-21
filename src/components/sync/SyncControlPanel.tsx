import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { syncManager } from '@/services/syncManager';
import { getSyncQueue } from '@/lib/db/indexedDB';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function SyncControlPanel() {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error' | 'offline'>('idle');
  const [queueSize, setQueueSize] = useState<number>(0);
  const [lastSync, setLastSync] = useState<string>('Never');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'idle') {
        setLastSync(new Date().toLocaleTimeString());
      }
    });

    // Update queue size periodically
    const updateQueue = async () => {
      const queue = await getSyncQueue();
      setQueueSize(queue.length);
    };

    updateQueue();
    const interval = setInterval(updateQueue, 5000);

    // Listen to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncNow = async () => {
    try {
      const result = await syncManager.sync();
      toast.success(`Synced ${result.success} items successfully`);
    } catch (error) {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'syncing':
        return 'default';
      case 'error':
        return 'destructive';
      case 'offline':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync Status
        </CardTitle>
        <CardDescription>
          Manage offline data synchronization
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection:</span>
          <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Sync Status:</span>
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Pending Items:</span>
          <Badge variant={queueSize > 0 ? 'default' : 'outline'}>
            {queueSize}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Sync:</span>
          <span className="text-sm text-muted-foreground">{lastSync}</span>
        </div>

        <Separator />

        <Button
          onClick={handleSyncNow}
          disabled={status === 'syncing' || !isOnline || queueSize === 0}
          className="w-full"
        >
          {status === 'syncing' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {queueSize > 0 ? `Sync Now (${queueSize} items)` : 'Nothing to Sync'}
            </>
          )}
        </Button>

        {!isOnline && (
          <p className="text-xs text-muted-foreground text-center">
            Sync will resume automatically when you're back online
          </p>
        )}
      </CardContent>
    </Card>
  );
}
