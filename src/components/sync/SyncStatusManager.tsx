import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Cloud, 
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useSync } from '@/hooks/useSync';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { toast } from 'sonner';

export function SyncStatusManager() {
  const { 
    conflicts, 
    lastSyncResult, 
    isSyncing, 
    performFullSync, 
    resolveConflict 
  } = useOfflineSync();
  
  const { pendingCount, isOnline } = useSync();
  
  const [selectedConflict, setSelectedConflict] = useState<typeof conflicts[0] | null>(null);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    // Auto-show manager if there are conflicts
    if (conflicts.length > 0) {
      setShowManager(true);
    }
  }, [conflicts]);

  const handleSync = async () => {
    try {
      const result = await performFullSync();
      
      if (result?.success) {
        toast.success(`Synced ${result.synced} items successfully`);
      } else {
        toast.error('Sync completed with errors');
      }
      
      if (result?.conflicts.length > 0) {
        toast.warning(`${result.conflicts.length} conflicts need resolution`);
      }
    } catch (error) {
      toast.error('Sync failed');
      console.error('[SyncStatusManager] Sync error:', error);
    }
  };

  const handleResolveConflict = async (resolution: 'local' | 'remote') => {
    if (!selectedConflict) return;
    
    try {
      await resolveConflict(selectedConflict, resolution);
      toast.success('Conflict resolved');
    } catch (error) {
      toast.error('Failed to resolve conflict');
      console.error('[SyncStatusManager] Resolve error:', error);
    }
  };

  if (!showManager) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowManager(true)}
        className="fixed bottom-4 right-4"
      >
        <Cloud className="h-4 w-4 mr-2" />
        Sync Status
      </Button>
    );
  }

  return (
    <>
      <Card className="fixed bottom-4 right-4 w-96 p-4 shadow-lg z-50">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Cloud className="h-5 w-5 text-primary" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              <h3 className="font-semibold">Sync Manager</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManager(false)}
            >
              ×
            </Button>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={isOnline ? 'default' : 'secondary'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending items:</span>
              <Badge variant={pendingCount > 0 ? 'destructive' : 'secondary'}>
                {pendingCount}
              </Badge>
            </div>

            {conflicts.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Conflicts:</span>
                <Badge variant="destructive">
                  {conflicts.length}
                </Badge>
              </div>
            )}
          </div>

          {/* Last sync result */}
          {lastSyncResult && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {lastSyncResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-muted-foreground">
                  Last sync: {lastSyncResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Synced: {lastSyncResult.synced} | Failed: {lastSyncResult.failed}
              </div>
            </div>
          )}

          {/* Sync progress */}
          {isSyncing && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Syncing...
              </p>
            </div>
          )}

          {/* Conflicts list */}
          {conflicts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Conflicts to resolve:</h4>
              <div className="space-y-1">
                {conflicts.map((conflict, index) => (
                  <Button
                    key={`${conflict.table}-${conflict.id}`}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedConflict(conflict)}
                  >
                    <AlertTriangle className="h-3 w-3 mr-2 text-destructive" />
                    <span className="capitalize">{conflict.table}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      #{conflict.id.slice(0, 8)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <Button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Conflict resolution dialog */}
      <ConflictResolutionDialog
        conflict={selectedConflict}
        open={!!selectedConflict}
        onClose={() => setSelectedConflict(null)}
        onResolve={handleResolveConflict}
      />
    </>
  );
}
