import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrainingJobMonitor } from "@/components/admin/TrainingJobMonitor";
import { ModelRegistryViewer } from "@/components/admin/ModelRegistryViewer";
import { TrainingDataUploader } from "@/components/admin/TrainingDataUploader";
import { TrainingJobTrigger } from "@/components/admin/TrainingJobTrigger";
import { MLTrainingAlerts } from "@/components/admin/MLTrainingAlerts";
import { MLCostTracker } from "@/components/admin/MLCostTracker";
import { ModelPerformanceTracker } from "@/components/admin/ModelPerformanceTracker";

export default function MLTraining() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ML Training & Model Registry</h1>
        <p className="text-muted-foreground mt-2">
          Manage machine learning training jobs and model deployments powered by Modal.com
        </p>
      </div>

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs">Training Jobs</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="registry">Model Registry</TabsTrigger>
          <TabsTrigger value="data">Training Data</TabsTrigger>
          <TabsTrigger value="trigger">Start Training</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <TrainingJobMonitor />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <MLTrainingAlerts />
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <MLCostTracker />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <ModelPerformanceTracker />
        </TabsContent>

        <TabsContent value="registry" className="space-y-4">
          <ModelRegistryViewer />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <TrainingDataUploader />
        </TabsContent>

        <TabsContent value="trigger" className="space-y-4">
          <TrainingJobTrigger />
        </TabsContent>
      </Tabs>
    </div>
  );
}
