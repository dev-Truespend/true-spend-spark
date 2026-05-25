import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, HardDrive, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function DataManagement() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageQuota, setStorageQuota] = useState(0);

  const checkStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      setStorageUsed(estimate.usage || 0);
      setStorageQuota(estimate.quota || 0);
    }
  };

  useEffect(() => { checkStorageUsage(); }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [{ data: transactions }, { data: budgets }, { data: geofences }] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('geofences').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        userId: user.id,
        data: { transactions: transactions || [], budgets: budgets || [], geofences: geofences || [] },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.version || !importData.data) {
        throw new Error('Invalid import file format');
      }

      const { data } = importData;
      let imported = 0;

      if (data.transactions?.length) {
        const rows = data.transactions.map((t: any) => ({ ...t, user_id: user.id }));
        const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
        if (!error) imported += rows.length;
      }

      if (data.budgets?.length) {
        const rows = data.budgets.map((b: any) => ({ ...b, user_id: user.id }));
        const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'id' });
        if (!error) imported += rows.length;
      }

      if (data.geofences?.length) {
        const rows = data.geofences.map((g: any) => ({ ...g, user_id: user.id }));
        const { error } = await supabase.from('geofences').upsert(rows, { onConflict: 'id' });
        if (!error) imported += rows.length;
      }

      toast.success(`Imported ${imported} items successfully`);
    } catch (error) {
      console.error('[DataManagement] Import error:', error);
      toast.error('Failed to import data. Please check the file format.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const storagePercent = storageQuota > 0 ? Math.round((storageUsed / storageQuota) * 100) : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Browser Storage
          </CardTitle>
          <CardDescription>Disk space used by this app in your browser</CardDescription>
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
              <AlertDescription>Storage is getting full. Consider exporting and clearing old data.</AlertDescription>
            </Alert>
          )}
          <Button variant="outline" onClick={checkStorageUsage} className="w-full">
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>Download all your data as JSON (GDPR compliant)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Export All Data</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </CardTitle>
          <CardDescription>Restore data from a previous export</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Importing merges with your existing data using upsert.</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            disabled={isImporting}
            className="w-full"
            onClick={() => document.getElementById('import-file')?.click()}
          >
            {isImporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Select Import File</>
            )}
          </Button>
          <input id="import-file" type="file" accept=".json" onChange={handleImport} className="hidden" />
        </CardContent>
      </Card>
    </div>
  );
}
