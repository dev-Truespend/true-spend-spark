import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrainingJobMonitor } from "@/components/admin/TrainingJobMonitor";
import { ModelRegistryViewer } from "@/components/admin/ModelRegistryViewer";
import { TrainingDataUploader } from "@/components/admin/TrainingDataUploader";
import { TrainingJobTrigger } from "@/components/admin/TrainingJobTrigger";

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
          <TabsTrigger value="registry">Model Registry</TabsTrigger>
          <TabsTrigger value="data">Training Data</TabsTrigger>
          <TabsTrigger value="trigger">Start Training</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <TrainingJobMonitor />
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
