// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";

export function ModelPerformanceTracker() {
  const [selectedModel, setSelectedModel] = useState<string>("all");

  const { data: models, isLoading } = useQuery({
    queryKey: ["model-performance", selectedModel],
    queryFn: async () => {
      let query = supabase
        .from("ml_model_registry")
        .select("*")
        .order("created_at", { ascending: true });

      if (selectedModel !== "all") {
        query = query.eq("model_type", selectedModel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const modelTypes = Array.from(new Set(models?.map((m) => m.model_type) || []));

  const prepareChartData = () => {
    if (!models) return [];

    return models.map((model, idx) => {
      const metrics = model.metrics as any || {};
      return {
        version: `v${idx + 1}`,
        accuracy: metrics.accuracy ? parseFloat((metrics.accuracy * 100).toFixed(2)) : null,
        loss: metrics.loss ? parseFloat(metrics.loss.toFixed(4)) : null,
        f1_score: metrics.f1_score ? parseFloat((metrics.f1_score * 100).toFixed(2)) : null,
        date: new Date(model.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    });
  };

  const chartData = prepareChartData();

  const getLatestMetrics = () => {
    if (!models || models.length === 0) return null;
    const latest = models[models.length - 1];
    const metrics = latest.metrics as any || {};
    return {
      accuracy: metrics.accuracy ? (metrics.accuracy * 100).toFixed(2) : "N/A",
      loss: metrics.loss ? metrics.loss.toFixed(4) : "N/A",
      f1_score: metrics.f1_score ? (metrics.f1_score * 100).toFixed(2) : "N/A",
    };
  };

  const calculateTrend = (metricName: string) => {
    if (!models || models.length < 2) return null;
    const latest = models[models.length - 1].metrics as any || {};
    const previous = models[models.length - 2].metrics as any || {};

    const latestValue = latest[metricName];
    const previousValue = previous[metricName];

    if (!latestValue || !previousValue) return null;

    const change = latestValue - previousValue;
    const isImproving = metricName === "loss" ? change < 0 : change > 0;

    return { change, isImproving };
  };

  const latestMetrics = getLatestMetrics();
  const accuracyTrend = calculateTrend("accuracy");
  const lossTrend = calculateTrend("loss");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Activity className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Model Type:</label>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {modelTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Latest Metrics Summary */}
      {latestMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              {accuracyTrend?.isImproving ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestMetrics.accuracy}%</div>
              {accuracyTrend && (
                <p className={`text-xs ${accuracyTrend.isImproving ? "text-green-500" : "text-red-500"}`}>
                  {accuracyTrend.isImproving ? "+" : ""}{(accuracyTrend.change * 100).toFixed(2)}% from previous
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loss</CardTitle>
              {lossTrend?.isImproving ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestMetrics.loss}</div>
              {lossTrend && (
                <p className={`text-xs ${lossTrend.isImproving ? "text-green-500" : "text-red-500"}`}>
                  {lossTrend.isImproving ? "" : "+"}{lossTrend.change.toFixed(4)} from previous
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">F1 Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestMetrics.f1_score}%</div>
              <p className="text-xs text-muted-foreground">Harmonic mean</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics Over Time</CardTitle>
          <CardDescription>Model accuracy, loss, and F1 score trends</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="version" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Accuracy (%)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="loss"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  name="Loss"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="f1_score"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  name="F1 Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No performance data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Version Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Model Versions</CardTitle>
          <CardDescription>Compare performance across versions</CardDescription>
        </CardHeader>
        <CardContent>
          {models && models.length > 0 ? (
            <div className="space-y-3">
              {models.map((model, idx) => {
                const metrics = model.metrics as any || {};
                return (
                  <div key={model.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">v{idx + 1}</Badge>
                      <div>
                        <p className="font-medium">{model.model_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(model.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      {metrics.accuracy && (
                        <div>
                          <span className="text-muted-foreground">Acc:</span>{" "}
                          <span className="font-semibold">{(metrics.accuracy * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      {metrics.loss && (
                        <div>
                          <span className="text-muted-foreground">Loss:</span>{" "}
                          <span className="font-semibold">{metrics.loss.toFixed(4)}</span>
                        </div>
                      )}
                      {metrics.f1_score && (
                        <div>
                          <span className="text-muted-foreground">F1:</span>{" "}
                          <span className="font-semibold">{(metrics.f1_score * 100).toFixed(2)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No model versions available yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
