import { RealtimeEventsDemo } from '@/features/observability/components/RealtimeEventsDemo';
import { BatchMetricsDashboard } from '@/features/observability/components/BatchMetricsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function RealtimeEvents() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Realtime Events & Batch Processing</h1>
        <p className="text-muted-foreground mt-2">
          Monitor event streams and adaptive batch processing performance
        </p>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Event Stream</TabsTrigger>
          <TabsTrigger value="batch">Batch Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="events" className="mt-6">
          <RealtimeEventsDemo />
        </TabsContent>
        
        <TabsContent value="batch" className="mt-6">
          <BatchMetricsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
