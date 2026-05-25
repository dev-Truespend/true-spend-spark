import { WorkflowManager } from '@/features/ml/components/WorkflowManager';
import { WorkflowExecutionMonitor } from '@/features/ml/components/WorkflowExecutionMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Workflow, Activity } from 'lucide-react';

export default function Workflows() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Workflow Orchestration</h1>
        <p className="text-muted-foreground">
          Create and monitor automated workflows with step-by-step execution
        </p>
      </div>

      <Tabs defaultValue="workflows" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Executions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows">
          <WorkflowManager />
        </TabsContent>

        <TabsContent value="executions">
          <WorkflowExecutionMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}