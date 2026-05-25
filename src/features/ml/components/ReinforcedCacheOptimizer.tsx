// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Slider } from "@/shared/components/ui/slider";
import { Loader2, Zap } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function ReinforcedCacheOptimizer() {
  const [episodeCount, setEpisodeCount] = useState([1000]);
  const [learningRate, setLearningRate] = useState([0.001]);
  const [discountFactor, setDiscountFactor] = useState([0.95]);
  const [epsilon, setEpsilon] = useState([0.1]);
  const [trainingDataId, setTrainingDataId] = useState<string | null>(null);

  const { data: latestModel } = useQuery({
    queryKey: ["latest-dqn-model"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_model_registry")
        .select("*")
        .eq("model_type", "dqn_cache_policy")
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
          model_type: "dqn_cache_policy",
          date_range: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTrainingDataId(data.training_data_id);
      toast.success(`Training data prepared: ${data.record_count} API requests`);
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
          model_type: "dqn_cache_policy",
          training_data_id: trainingDataId,
          config: {
            episode_count: episodeCount[0],
            learning_rate: learningRate[0],
            discount_factor: discountFactor[0],
            epsilon: epsilon[0],
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
          <Zap className="h-5 w-5" />
          DQN Cache Policy Optimization
        </CardTitle>
        <CardDescription>
          Train a Deep Q-Network to optimize API caching decisions
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
                  <div className="text-xs text-muted-foreground">Hit Rate</div>
                  <div className="text-lg font-semibold text-green-600">
                    {(latestModel.metrics as any).hit_rate?.toFixed(1) || "N/A"}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Avg Latency</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).avg_latency?.toFixed(0) || "N/A"}ms
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Reward</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).final_reward?.toFixed(2) || "N/A"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Episode Count: {episodeCount[0]}</Label>
            <Slider
              value={episodeCount}
              onValueChange={setEpisodeCount}
              min={100}
              max={10000}
              step={100}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Learning Rate: {learningRate[0].toFixed(4)}</Label>
            <Slider
              value={learningRate}
              onValueChange={setLearningRate}
              min={0.0001}
              max={0.01}
              step={0.0001}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Discount Factor (γ): {discountFactor[0].toFixed(2)}</Label>
            <Slider
              value={discountFactor}
              onValueChange={setDiscountFactor}
              min={0.9}
              max={0.99}
              step={0.01}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Epsilon (Exploration): {epsilon[0].toFixed(2)}</Label>
            <Slider
              value={epsilon}
              onValueChange={setEpsilon}
              min={0.01}
              max={0.3}
              step={0.01}
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
