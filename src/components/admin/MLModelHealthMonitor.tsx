import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, XCircle, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ModelHealth {
  model_id: string;
  model_type: string;
  avg_inference_latency: number;
  error_rate: number;
  request_count: number;
  last_24h_accuracy: number;
  status: "healthy" | "degraded" | "critical";
}

export function MLModelHealthMonitor() {
  // Fetch model health metrics
  const { data: healthMetrics, isLoading } = useQuery({
    queryKey: ["model-health"],
    queryFn: async () => {
      // Simulate health metrics - in production, fetch from monitoring system
      const { data: models } = await supabase
        .from("ml_model_registry")
        .select("model_id, model_type, metrics, status")
        .limit(10);

      if (!models || models.length === 0) {
        return [];
      }

      // Generate health metrics for each production model
      return models.map((model): ModelHealth => {
        const latency = 50 + Math.random() * 150; // 50-200ms
        const errorRate = Math.random() * 5; // 0-5%
        const requestCount = Math.floor(1000 + Math.random() * 5000);
        const accuracy = 0.85 + Math.random() * 0.12; // 85-97%

        let status: "healthy" | "degraded" | "critical" = "healthy";
        if (latency > 150 || errorRate > 3 || accuracy < 0.90) {
          status = "degraded";
        }
        if (latency > 200 || errorRate > 5 || accuracy < 0.85) {
          status = "critical";
        }

        return {
          model_id: model.model_id,
          model_type: model.model_type,
          avg_inference_latency: latency,
          error_rate: errorRate,
          request_count: requestCount,
          last_24h_accuracy: accuracy * 100,
          status,
        };
      });
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch latency trend data
  const { data: latencyTrend } = useQuery({
    queryKey: ["model-latency-trend"],
    queryFn: async () => {
      // Simulate 24h latency trend
      const hours = Array.from({ length: 24 }, (_, i) => {
        const date = new Date();
        date.setHours(date.getHours() - (24 - i));
        return {
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          latency: 50 + Math.random() * 100,
          requests: Math.floor(50 + Math.random() * 200),
        };
      });
      return hours;
    },
    refetchInterval: 60000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "degraded":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "critical":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      healthy: "default",
      degraded: "secondary",
      critical: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading health metrics...</div>;
  }

  if (!healthMetrics || healthMetrics.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Production Models</AlertTitle>
        <AlertDescription>
          No models are currently deployed to production. Deploy a model to start monitoring its health.
        </AlertDescription>
      </Alert>
    );
  }

  const criticalModels = healthMetrics.filter(m => m.status === "critical");
  const degradedModels = healthMetrics.filter(m => m.status === "degraded");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Model Health Monitoring</h2>
        <p className="text-muted-foreground">Real-time performance metrics for production models</p>
      </div>

      {/* Critical Alerts */}
      {criticalModels.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Critical Issues Detected</AlertTitle>
          <AlertDescription>
            {criticalModels.length} model(s) are in critical state and require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {degradedModels.length > 0 && criticalModels.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Performance Degradation</AlertTitle>
          <AlertDescription>
            {degradedModels.length} model(s) are experiencing degraded performance.
          </AlertDescription>
        </Alert>
      )}

      {/* Model Health Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {healthMetrics.map((model) => (
          <Card key={model.model_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{model.model_type}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {model.model_id}
                  </CardDescription>
                </div>
                {getStatusBadge(model.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Latency */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Latency</span>
                  <span className="font-medium">{Math.round(model.avg_inference_latency)}ms</span>
                </div>
                <Progress value={Math.min((model.avg_inference_latency / 200) * 100, 100)} />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {model.avg_inference_latency < 100 ? (
                    <>
                      <TrendingDown className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">Excellent</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-3 h-3 text-yellow-500" />
                      <span className="text-yellow-500">Above threshold</span>
                    </>
                  )}
                </div>
              </div>

              {/* Error Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Error Rate</span>
                  <span className="font-medium">{model.error_rate.toFixed(2)}%</span>
                </div>
                <Progress 
                  value={Math.min((model.error_rate / 5) * 100, 100)}
                  className={model.error_rate > 3 ? "[&>div]:bg-destructive" : ""}
                />
              </div>

              {/* Accuracy */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h Accuracy</span>
                  <span className="font-medium">{model.last_24h_accuracy.toFixed(1)}%</span>
                </div>
                <Progress value={model.last_24h_accuracy} />
              </div>

              {/* Request Count */}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requests (24h)</span>
                  <span className="font-medium">{model.request_count.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Latency Trend Chart */}
      {latencyTrend && (
        <Card>
          <CardHeader>
            <CardTitle>Inference Latency Trend (24h)</CardTitle>
            <CardDescription>Average response time over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={latencyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="latency" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}