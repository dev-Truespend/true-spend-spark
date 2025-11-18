import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackupStatusDashboard } from "@/components/data-planes/BackupStatusDashboard";
import { AuditLogViewer } from "@/components/data-planes/AuditLogViewer";
import { CacheAnalyticsDashboard } from "@/components/data-planes/CacheAnalyticsDashboard";
import { Database, Shield, Activity } from "lucide-react";

export default function DataPlanes() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Planes & Disaster Recovery</h1>
        <p className="text-muted-foreground mt-2">
          Monitor audit logs, backup health, and cache performance
        </p>
      </div>

      <Tabs defaultValue="backup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup & DR
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Cache Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="backup" className="space-y-4">
          <BackupStatusDashboard />
        </TabsContent>
        
        <TabsContent value="audit" className="space-y-4">
          <AuditLogViewer />
        </TabsContent>
        
        <TabsContent value="cache" className="space-y-4">
          <CacheAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
