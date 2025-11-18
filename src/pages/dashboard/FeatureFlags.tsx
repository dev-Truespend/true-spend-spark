import { FeatureFlagManager } from '@/components/admin/FeatureFlagManager';
import { ServiceRegistryDashboard } from '@/components/admin/ServiceRegistryDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, Activity } from 'lucide-react';

export default function FeatureFlags() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Feature Flags & Services</h1>
        <p className="text-muted-foreground">
          Manage feature rollouts and monitor service health
        </p>
      </div>

      <Tabs defaultValue="flags" className="space-y-6">
        <TabsList>
          <TabsTrigger value="flags" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Service Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flags">
          <FeatureFlagManager />
        </TabsContent>

        <TabsContent value="services">
          <ServiceRegistryDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}