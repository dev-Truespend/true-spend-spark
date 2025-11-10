import { useState } from 'react';
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
import { AlertTriangle, Cloud, Smartphone } from 'lucide-react';

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

  if (!conflict) return null;

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution);
      setSelectedResolution(null);
      onClose();
    }
  };

  const renderDataPreview = (data: any) => {
    return (
      <div className="space-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'id' || key === 'user_id' || key === 'synced') return null;
          
          return (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="font-medium">
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
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Sync Conflict Detected</DialogTitle>
          </div>
          <DialogDescription>
            The same {conflict.table} record was modified both locally and remotely.
            Choose which version to keep.
          </DialogDescription>
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
            </div>
            {renderDataPreview(conflict.localData)}
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
            </div>
            {renderDataPreview(conflict.remoteData)}
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
