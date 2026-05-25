import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Calendar, Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function ProphetForecaster() {
  const [forecastHorizon, setForecastHorizon] = useState("30");
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [seasonalityMode, setSeasonalityMode] = useState("additive");
  const [trainingDataId, setTrainingDataId] = useState<string | null>(null);

  const { data: latestModel } = useQuery({
    queryKey: ["latest-prophet-model"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_model_registry")
        .select("*")
        .eq("model_type", "prophet_forecast")
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
          model_type: "prophet_forecast",
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
      toast.success(`Training data prepared: ${data.record_count} days of data`);
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
          model_type: "prophet_forecast",
          training_data_id: trainingDataId,
          config: {
            horizon: parseInt(forecastHorizon),
            include_holidays: includeHolidays,
            seasonality_mode: seasonalityMode,
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
          <Calendar className="h-5 w-5" />
          Prophet Time Series Forecasting
        </CardTitle>
        <CardDescription>
          Train a Prophet model to forecast future spending patterns
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
                  <div className="text-xs text-muted-foreground">MAPE</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).mape?.toFixed(2) || "N/A"}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">RMSE</div>
                  <div className="text-lg font-semibold">
                    ${(latestModel.metrics as any).rmse?.toFixed(0) || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">R²</div>
                  <div className="text-lg font-semibold">
                    {(latestModel.metrics as any).r2?.toFixed(3) || "N/A"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Forecast Horizon</Label>
            <Select value={forecastHorizon} onValueChange={setForecastHorizon}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Include Holidays</Label>
            <Switch checked={includeHolidays} onCheckedChange={setIncludeHolidays} />
          </div>

          <div>
            <Label>Seasonality Mode</Label>
            <Select value={seasonalityMode} onValueChange={setSeasonalityMode}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="additive">Additive</SelectItem>
                <SelectItem value="multiplicative">Multiplicative</SelectItem>
              </SelectContent>
            </Select>
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
