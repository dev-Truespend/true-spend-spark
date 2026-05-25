// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const GPU_COST_PER_HOUR = 0.60; // Modal A10G GPU cost
const MODEL_TRAINING_ESTIMATES = {
  "dqn-cache": 0.5, // hours
  "lstm-anomaly": 1.0,
  "distilbert-classifier": 2.0,
  "als-recommender": 0.75,
};

export function MLCostTracker() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["training-costs"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("ml_training_jobs")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const calculateCosts = () => {
    if (!jobs) return { total: 0, byModel: {}, chartData: [], projected: 0 };

    const byModel: Record<string, number> = {};
    const dailyCosts: Record<string, number> = {};

    jobs.forEach((job) => {
      if (job.status === "completed" || job.status === "failed") {
        const estimatedHours = MODEL_TRAINING_ESTIMATES[job.model_type as keyof typeof MODEL_TRAINING_ESTIMATES] || 1.0;
        const cost = estimatedHours * GPU_COST_PER_HOUR;

        byModel[job.model_type] = (byModel[job.model_type] || 0) + cost;

        const date = new Date(job.created_at).toISOString().split("T")[0];
        dailyCosts[date] = (dailyCosts[date] || 0) + cost;
      }
    });

    const total = Object.values(byModel).reduce((sum, cost) => sum + cost, 0);
    const chartData = Object.entries(dailyCosts).map(([date, cost]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost: parseFloat(cost.toFixed(2)),
    }));

    // Project monthly cost based on last 30 days
    const projected = (total / 30) * 30; // Already 30 days, so same as total

    return { total, byModel, chartData, projected };
  };

  const { total, byModel, chartData, projected } = calculateCosts();
  const budget = 50; // $50/month budget
  const budgetPercentage = (total / budget) * 100;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <DollarSign className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30-Day Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {jobs?.length || 0} training runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Monthly</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${projected.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Based on current usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <AlertCircle className={`h-4 w-4 ${budgetPercentage > 80 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetPercentage.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              ${budget - total > 0 ? (budget - total).toFixed(2) : 0} remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Trend (Last 30 Days)</CardTitle>
          <CardDescription>Daily training costs over time</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No cost data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown by Model */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Model Type</CardTitle>
          <CardDescription>30-day spend per model</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(byModel).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(byModel).map(([modelType, cost]) => (
                <div key={modelType} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{modelType}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {jobs?.filter((j) => j.model_type === modelType).length || 0} runs
                    </span>
                  </div>
                  <span className="font-semibold">${cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No training jobs completed yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
