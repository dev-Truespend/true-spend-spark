import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Store } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function ALSRecommender() {
  const [numFactors, setNumFactors] = useState([50]);
  const [regularization, setRegularization] = useState([0.1]);
  const [iterations, setIterations] = useState([20]);
  const [trainingDataId, setTrainingDataId] = useState<string | null>(null);

  const { data: latestModel } = useQuery({
    queryKey: ["latest-als-model"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_model_registry")
        .select("*")
        .eq("model_type", "als_collab_filter")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const prepareDataMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("prepare-training-data", {
        body: {
          model_type: "als_collab_filter",
          date_range: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTrainingDataId(data.training_data_id);
      toast.success(`Training data prepared: ${data.record_count} interactions`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to prepare data: ${error.message}`);
    },
  });

  const startTrainingMutation = useMutation({
    mutationFn: async () => {
      if (!trainingDataId) throw new Error("Please prepare training data first");

      const { data, error } = await supabase.functions.invoke("modal-training-trigger", {
        body: {
          model_type: "als_collab_filter",
          training_data_id: trainingDataId,
          config: {
            num_factors: numFactors[0],
            regularization: regularization[0],
            iterations: iterations[0],
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Training job started: ${data.job_id}`);
      setTrainingDataId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to start training: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          ALS Collaborative Filtering
        </CardTitle>
        <CardDescription>
          Train an Alternating Least Squares model for merchant recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {latestModel && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Latest Model</span>
              <span className="text-sm text-muted-foreground">
                v{latestModel.version} • {format(new Date(latestModel.created_at), "PPP")}
              </span>
            </div>
            {latestModel.metrics && (
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <div className="text-xs text-muted-foreground">Precision@10</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).precision_10?.toFixed(3) || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Recall@10</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).recall_10?.toFixed(3) || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Coverage</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).coverage?.toFixed(1) || "N/A"}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Number of Factors: {numFactors[0]}</Label>
            <Slider
              value={numFactors}
              onValueChange={setNumFactors}
              min={10}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Regularization: {regularization[0].toFixed(2)}</Label>
            <Slider
              value={regularization}
              onValueChange={setRegularization}
              min={0.01}
              max={1.0}
              step={0.01}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Iterations: {iterations[0]}</Label>
            <Slider
              value={iterations}
              onValueChange={setIterations}
              min={10}
              max={50}
              step={5}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => prepareDataMutation.mutate()}
            disabled={prepareDataMutation.isPending}
            variant="outline"
            className="flex-1"
          >
            {prepareDataMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Prepare Training Data
          </Button>
          <Button
            onClick={() => startTrainingMutation.mutate()}
            disabled={!trainingDataId || startTrainingMutation.isPending}
            className="flex-1"
          >
            {startTrainingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Training
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
