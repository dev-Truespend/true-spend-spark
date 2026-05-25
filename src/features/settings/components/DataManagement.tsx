import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Progress } from '@/shared/components/ui/progress';
import { useOfflineStorage } from '@/features/sync/hooks/useOfflineStorage';
import { Download, Upload, HardDrive, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function DataManagement() {
  const { storage } = useOfflineStorage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageQuota, setStorageQuota] = useState(0);

  // Estimate storage usage
  const checkStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      setStorageUsed(estimate.usage || 0);
      setStorageQuota(estimate.quota || 0);
    }
  };

  // Export all user data
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all user data
      const [transactions, budgets, geofences] = await Promise.all([
        storage.getAll('transactions'),
        storage.getAll('budgets'),
        storage.getAll('geofences'),
      ]);

      // Create export object
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId: user.id,
        data: {
          transactions,
          budgets,
          geofences,
        },
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truespend-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('[DataManagement] Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  // Import user data
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate import format
      if (!importData.version || !importData.data) {
        throw new Error('Invalid import file format');
      }

      // Import data
      const { data } = importData;
      let imported = 0;

      if (data.transactions) {
        for (const tx of data.transactions) {
          await storage.set('transactions', tx.id, tx);
          imported++;
        }
      }

      if (data.budgets) {
        for (const budget of data.budgets) {
          await storage.set('budgets', budget.id, budget);
          imported++;
        }
      }

      if (data.geofences) {
        for (const geofence of data.geofences) {
          await storage.set('geofences', geofence.id, geofence);
          imported++;
        }
      }

      toast.success(`Imported ${imported} items successfully`);
    } catch (error) {
      console.error('[DataManagement] Import error:', error);
      toast.error('Failed to import data. Please check file format.');
    } finally {
      setIsImporting(false);
      event.target.value = ''; // Reset input
    }
  };

  // Clear all local data
  const handleClearData = async () => {
    if (!confirm('⚠️ This will delete all local data. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    try {
      await storage.clear('transactions');
      await storage.clear('budgets');
      await storage.clear('geofences');
      await storage.clear('sync_queue');

      toast.success('Local data cleared successfully');
      await checkStorageUsage();
    } catch (error) {
      console.error('[DataManagement] Clear error:', error);
      toast.error('Failed to clear local data');
    } finally {
      setIsClearing(false);
    }
  };

  // Check storage on mount
  useState(() => {
    checkStorageUsage();
  });

  const storagePercent = storageQuota > 0 
    ? Math.round((storageUsed / storageQuota) * 100)
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Storage Quota */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
          <CardDescription>
            Monitor your local storage usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {formatBytes(storageUsed)} of {formatBytes(storageQuota)} used
              </span>
              <span className="font-medium">{storagePercent}%</span>
            </div>
            <Progress value={storagePercent} className="h-2" />
          </div>

          {storagePercent > 80 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Storage is getting full. Consider exporting and clearing old data.
              </AlertDescription>
            </Alert>
          )}

          <Button
            variant="outline"
            onClick={checkStorageUsage}
            className="w-full"
          >
            Refresh Storage Info
          </Button>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download all your data as JSON (GDPR compliant)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export All Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </CardTitle>
          <CardDescription>
            Restore data from a previous export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Importing will add to existing data. Back up first!
            </AlertDescription>
          </Alert>
          
          <label htmlFor="import-file">
            <Button
              variant="outline"
              disabled={isImporting}
              className="w-full"
              onClick={() => document.getElementById('import-file')?.click()}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Select Import File
                </>
              )}
            </Button>
          </label>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Clear Data */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Clear All Data
          </CardTitle>
          <CardDescription>
            Permanently delete all local data (cannot be undone)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will delete all transactions, budgets, and geofences stored locally.
              Export your data first if you want to keep it!
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            onClick={handleClearData}
            disabled={isClearing}
            className="w-full"
          >
            {isClearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Local Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
