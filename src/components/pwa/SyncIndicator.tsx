import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSync } from '@/hooks/useSync';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const { syncStatus, pendingCount, isOnline, isSyncing, triggerManualSync } = useSync();

  if (pendingCount === 0 && syncStatus !== 'syncing') return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="flex items-center gap-2 bg-background border rounded-lg shadow-lg p-3">
        {syncStatus === 'syncing' || isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Syncing...</span>
          </>
        ) : syncStatus === 'error' ? (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Sync failed</span>
            {isOnline && (
              <Button
                variant="ghost"
                size="sm"
                onClick={triggerManualSync}
                className="ml-2"
              >
                Retry
              </Button>
            )}
          </>
        ) : syncStatus === 'success' ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">All synced</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {pendingCount} pending
            </span>
            {isOnline && (
              <Button
                variant="ghost"
                size="sm"
                onClick={triggerManualSync}
                className="ml-2"
              >
                Sync now
              </Button>
            )}
          </>
        )}
        
        {pendingCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {pendingCount}
          </Badge>
        )}
      </div>
    </div>
  );
}
