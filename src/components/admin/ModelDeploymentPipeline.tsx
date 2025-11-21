import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Circle, ArrowRight, RotateCcw, PlayCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ModelDeploymentPipeline() {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deploymentStage, setDeploymentStage] = useState<"shadow" | "ab-test" | "production">("shadow");

  // Fetch models
  const { data: models } = useQuery({
    queryKey: ["ml-models-deployment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_model_registry")
        .select("model_id, model_type, version, created_at, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as any[];
    },
  });

  // Deploy to shadow
  const deployShadowMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const { data, error } = await supabase.functions.invoke("deploy-shadow-model", {
        body: { model_id: modelId, traffic_split: 5 },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-models-deployment"] });
      toast.success("Model deployed to shadow environment");
    },
    onError: (error) => {
      toast.error(`Shadow deployment failed: ${error.message}`);
    },
  });

  // Rollback to previous version
  const rollbackMutation = useMutation({
    mutationFn: async (modelId: string) => {
      // Simple direct update - types file will refresh after deployment
      const result = await supabase
        .from("ml_model_registry")
        .update({ production_deployed: true } as any)
        .eq("model_id", modelId);
      
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-models-deployment"] });
      toast.success("Rolled back to previous version");
    },
    onError: (error) => {
      toast.error(`Rollback failed: ${error.message}`);
    },
  });

  const getDeploymentStage = (model: any) => {
    if ((model as any).production_deployed) return "production";
    if ((model as any).shadow_deployed) return "shadow";
    return "training";
  };

  const stages = [
    { id: "training", label: "Training", icon: PlayCircle },
    { id: "shadow", label: "Shadow (5%)", icon: Circle },
    { id: "ab-test", label: "A/B Test", icon: Circle },
    { id: "production", label: "Production", icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Deployment Pipeline</h2>
        <p className="text-muted-foreground">Visual deployment workflow with stage gates</p>
      </div>

      {/* Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Stages</CardTitle>
          <CardDescription>Models progress through these stages before production</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full border-2 border-border bg-background">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">{stage.label}</span>
                  </div>
                  {index < stages.length - 1 && (
                    <ArrowRight className="w-6 h-6 mx-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Production Model */}
      <Card>
        <CardHeader>
          <CardTitle>Current Production Model</CardTitle>
        </CardHeader>
        <CardContent>
          {models?.find(m => (m as any).production_deployed) ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {models.find(m => (m as any).production_deployed)?.model_type} v
                    {models.find(m => (m as any).production_deployed)?.version}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Model ID: {models.find(m => (m as any).production_deployed)?.model_id}
                  </p>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Production
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const prevModel = models?.find(
                    (m, i) => i > 0 && (models[i - 1] as any)?.production_deployed
                  );
                  if (prevModel) {
                    rollbackMutation.mutate(prevModel.model_id);
                  }
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rollback
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>No model in production</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model List with Deployment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Models & Deployment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {models?.map((model) => {
              const stage = getDeploymentStage(model);
              return (
                <div
                  key={model.model_id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {model.model_type} v{model.version}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Trained {new Date(model.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={stage === "production" ? "default" : "outline"}>
                      {stage === "production" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {stage}
                    </Badge>
                    {!(model as any).shadow_deployed && !(model as any).production_deployed && (
                      <Button
                        size="sm"
                        onClick={() => deployShadowMutation.mutate(model.model_id)}
                      >
                        Deploy to Shadow
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models?.filter(m => (m as any).production_deployed || (m as any).shadow_deployed).map((model) => (
              <div key={model.model_id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <div className="w-0.5 h-full bg-border" />
                </div>
                <div className="pb-4">
                  <p className="font-medium">{model.model_type} v{model.version}</p>
                  <p className="text-sm text-muted-foreground">
                    {(model as any).production_deployed
                      ? `Deployed to production`
                      : `Deployed to shadow (${(model as any).shadow_traffic_split || 5}%)`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date((model as any).shadow_deployed_at || model.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}