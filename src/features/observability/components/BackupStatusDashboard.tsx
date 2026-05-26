import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { CheckCircle, AlertCircle, Database, RefreshCw, Clock } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { toast } from "sonner";

export const BackupStatusDashboard = () => {
  const { data: backups, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['backup-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_status')
        .select('*')
        .order('backup_timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  const triggerVerification = async () => {
    try {
      toast.loading("Verifying backup status...", { id: "backup-verify" });
      
      const { error } = await supabase.functions.invoke('backup-verification');
      
      if (error) throw error;
      
      await refetch();
      toast.success("Backup verification complete!", { id: "backup-verify" });
    } catch (error) {
      console.error('Backup verification failed:', error);
      toast.error("Failed to verify backups", { id: "backup-verify" });
    }
  };

  const latestBackup = backups?.[0];
  const isHealthy = latestBackup && 
    (Date.now() - new Date(latestBackup.backup_timestamp).getTime()) < 25 * 60 * 60 * 1000;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Backup & Disaster Recovery</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={triggerVerification}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Verify Now
        </Button>
      </div>

      {/* Health Status Card */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
        <h3 className="text-lg font-semibold mb-4">Backup Health Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Last Backup</div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {latestBackup ? format(new Date(latestBackup.backup_timestamp), 'PPpp') : 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <Badge variant="default" className="flex items-center gap-2 bg-green-500 hover:bg-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Healthy
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {latestBackup ? 'Stale' : 'No Backups'}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Retention</div>
            <div className="font-medium">30 days (Supabase PITR)</div>
          </div>
        </div>
        
        {!isHealthy && latestBackup && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-destructive">Backup Warning</div>
                <div className="text-sm text-destructive/80">
                  Last backup is more than 25 hours old. Expected daily backups from Supabase.
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Recovery Info Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Disaster Recovery Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Recovery Time Objective (RTO)</div>
            <div className="text-2xl font-bold text-primary">{'<'} 15 minutes</div>
            <div className="text-xs text-muted-foreground mt-1">
              Maximum time to restore service
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Recovery Point Objective (RPO)</div>
            <div className="text-2xl font-bold text-primary">{'<'} 24 hours</div>
            <div className="text-xs text-muted-foreground mt-1">
              Maximum acceptable data loss
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Backups Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Backups</h3>
        {backups && backups.length > 0 ? (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div key={backup.id} className="flex justify-between items-center py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {format(new Date(backup.backup_timestamp), 'PPpp')}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {backup.backup_type} backup
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={backup.status === 'success' ? 'default' : 'destructive'}
                    className={backup.status === 'success' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {backup.status}
                  </Badge>
                  {backup.verification_status && (
                    <Badge variant="outline">
                      {backup.verification_status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No backup records found. Click "Verify Now" to check backup status.</p>
          </div>
        )}
      </Card>
    </div>
  );
};
