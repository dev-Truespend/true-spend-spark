import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Slider } from "@/shared/components/ui/slider";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { CalendarIcon, Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

export function LambdaMARTTrainer() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [numTrees, setNumTrees] = useState([100]);
  const [learningRate, setLearningRate] = useState([0.05]);
  const [maxDepth, setMaxDepth] = useState([6]);
  const [trainingDataId, setTrainingDataId] = useState<string | null>(null);

  const { data: latestModel } = useQuery({
    queryKey: ["latest-lambdamart-model"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_model_registry")
        .select("*")
        .eq("model_type", "lambdamart_ranking")
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
          model_type: "lambdamart_ranking",
          date_range: {
            start: dateRange.from.toISOString(),
            end: dateRange.to.toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTrainingDataId(data.training_data_id);
      toast.success(`Training data prepared: ${data.record_count} records`);
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
          model_type: "lambdamart_ranking",
          training_data_id: trainingDataId,
          config: {
            num_trees: numTrees[0],
            learning_rate: learningRate[0],
            max_depth: maxDepth[0],
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
          <TrendingUp className="h-5 w-5" />
          LambdaMART Offer Ranking
        </CardTitle>
        <CardDescription>
          Train a gradient boosted ranking model to optimize offer CTR
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
                  <div className="text-xs text-muted-foreground">NDCG@10</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).ndcg_10?.toFixed(3) || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">MAP</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).map?.toFixed(3) || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">CTR Lift</div>
                  <div className="text-lg font-semibold text-green-600">
                    +{(latestModel.metrics as any).ctr_lift?.toFixed(1) || "0"}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Training Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-2")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Number of Trees: {numTrees[0]}</Label>
            <Slider
              value={numTrees}
              onValueChange={setNumTrees}
              min={50}
              max={500}
              step={10}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Learning Rate: {learningRate[0].toFixed(3)}</Label>
            <Slider
              value={learningRate}
              onValueChange={setLearningRate}
              min={0.001}
              max={0.1}
              step={0.001}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Max Depth: {maxDepth[0]}</Label>
            <Slider
              value={maxDepth}
              onValueChange={setMaxDepth}
              min={3}
              max={10}
              step={1}
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
