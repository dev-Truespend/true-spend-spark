import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Cloud, Smartphone, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncConflict {
  localData: any;
  remoteData: any;
  table: string;
  id: string;
}

interface ConflictResolutionDialogProps {
  conflict: SyncConflict | null;
  open: boolean;
  onClose: () => void;
  onResolve: (resolution: 'local' | 'remote') => void;
}

export function ConflictResolutionDialog({
  conflict,
  open,
  onClose,
  onResolve,
}: ConflictResolutionDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        onClose();
      }
      // L for local
      if (e.key === 'l' || e.key === 'L') {
        setSelectedResolution('local');
      }
      // R for remote
      if (e.key === 'r' || e.key === 'R') {
        setSelectedResolution('remote');
      }
      // D to toggle diff
      if (e.key === 'd' || e.key === 'D') {
        setShowDiff(prev => !prev);
      }
      // Enter to confirm
      if (e.key === 'Enter' && selectedResolution) {
        handleResolve();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedResolution]);

  if (!conflict) return null;

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution);
      setSelectedResolution(null);
      onClose();
    }
  };

  const renderDataPreview = (data: any, compareData?: any) => {
    return (
      <div className="space-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'id' || key === 'user_id' || key === 'synced') return null;
          
          const isDifferent = compareData && showDiff && 
            JSON.stringify(compareData[key]) !== JSON.stringify(value);
          
          return (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span 
                className={cn(
                  'font-medium text-right',
                  isDifferent && 'bg-yellow-500/20 px-2 py-0.5 rounded'
                )}
              >
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <DialogTitle>Sync Conflict Detected</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiff(!showDiff)}
              className="gap-2"
            >
              {showDiff ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDiff ? 'Hide' : 'Show'} Diff
            </Button>
          </div>
          <DialogDescription>
            The same {conflict.table} record was modified both locally and remotely.
            Choose which version to keep.
          </DialogDescription>
          <div className="text-xs text-muted-foreground mt-2">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">L</kbd> Local • 
            <kbd className="px-1.5 py-0.5 bg-muted rounded ml-1">R</kbd> Remote • 
            <kbd className="px-1.5 py-0.5 bg-muted rounded ml-1">D</kbd> Toggle Diff • 
            <kbd className="px-1.5 py-0.5 bg-muted rounded ml-1">ESC</kbd> Close
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Local version */}
          <Card
            className={`p-4 cursor-pointer transition-all ${
              selectedResolution === 'local'
                ? 'ring-2 ring-primary'
                : 'hover:border-primary'
            }`}
            onClick={() => setSelectedResolution('local')}
          >
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Local Version</h3>
              <Badge variant="secondary">This Device</Badge>
              {selectedResolution === 'local' && (
                <Badge variant="default" className="ml-auto">Selected</Badge>
              )}
            </div>
            <Separator className="mb-3" />
            {renderDataPreview(conflict.localData, conflict.remoteData)}
          </Card>

          {/* Remote version */}
          <Card
            className={`p-4 cursor-pointer transition-all ${
              selectedResolution === 'remote'
                ? 'ring-2 ring-primary'
                : 'hover:border-primary'
            }`}
            onClick={() => setSelectedResolution('remote')}
          >
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Remote Version</h3>
              <Badge variant="secondary">Cloud</Badge>
              {selectedResolution === 'remote' && (
                <Badge variant="default" className="ml-auto">Selected</Badge>
              )}
            </div>
            <Separator className="mb-3" />
            {renderDataPreview(conflict.remoteData, conflict.localData)}
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Decide Later
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!selectedResolution}
          >
            Use {selectedResolution === 'local' ? 'Local' : 'Remote'} Version
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
