import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { TrainingJobMonitor } from "@/features/ml/components/TrainingJobMonitor";
import { ModelRegistryViewer } from "@/features/ml/components/ModelRegistryViewer";
import { TrainingDataUploader } from "@/features/ml/components/TrainingDataUploader";
import { TrainingJobTrigger } from "@/features/ml/components/TrainingJobTrigger";
import { MLTrainingAlerts } from "@/features/ml/components/MLTrainingAlerts";
import { MLCostTracker } from "@/features/ml/components/MLCostTracker";
import { ModelPerformanceTracker } from "@/features/ml/components/ModelPerformanceTracker";
import { MLABTestManager } from "@/features/ml/components/MLABTestManager";
import { ModelDeploymentPipeline } from "@/features/ml/components/ModelDeploymentPipeline";
import { MLModelHealthMonitor } from "@/features/ml/components/MLModelHealthMonitor";
import { TrainingDataQualityChecker } from "@/features/ml/components/TrainingDataQualityChecker";

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
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="registry">Model Registry</TabsTrigger>
          <TabsTrigger value="data">Training Data</TabsTrigger>
          <TabsTrigger value="trigger">Start Training</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <TrainingJobMonitor />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <MLModelHealthMonitor />
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <TrainingDataQualityChecker />
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

        <TabsContent value="ab-testing" className="space-y-4">
          <MLABTestManager />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <ModelDeploymentPipeline />
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
