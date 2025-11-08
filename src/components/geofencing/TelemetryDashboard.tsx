import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGeofenceMetrics } from '@/hooks/useGeofenceMetrics';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Zap, AlertCircle, Target, Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function TelemetryDashboard() {
  const { metrics, kpis, aggregatedMetrics, isLoading } = useGeofenceMetrics(60);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Prepare chart data
  const latencyData = metrics
    .filter(m => m.metric_type === 'latency')
    .slice(-20)
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      value: Number(m.value),
    }));

  const throughputData = metrics
    .filter(m => m.metric_type === 'throughput')
    .slice(-20)
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      value: Number(m.value),
    }));

  const getStatusColor = (value: number, threshold: number, inverse: boolean = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return isGood ? 'text-green-500' : 'text-red-500';
  };

  const getStatusBadge = (value: number, threshold: number, inverse: boolean = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return (
      <Badge variant={isGood ? 'default' : 'destructive'}>
        {isGood ? 'Healthy' : 'Degraded'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(kpis.avgLatency, 200, true)}`}>
              {kpis.avgLatency.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">Target: &lt;200ms</p>
            <Progress value={Math.min((200 / kpis.avgLatency) * 100, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.throughput.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">requests/sec</p>
            <Progress value={Math.min((kpis.throughput / 100) * 100, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(kpis.errorRate, 5, true)}`}>
              {kpis.errorRate.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Target: &lt;5%</p>
            {getStatusBadge(kpis.errorRate, 5, true)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Ratio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(kpis.cacheHitRatio, 80)}`}>
              {kpis.cacheHitRatio.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Target: &gt;80%</p>
            <Progress value={kpis.cacheHitRatio} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(kpis.aiAccuracy, 85)}`}>
              {kpis.aiAccuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Prediction accuracy</p>
            <Progress value={kpis.aiAccuracy} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latency Trend</CardTitle>
            <CardDescription>Last 20 measurements (ms)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Throughput Trend</CardTitle>
            <CardDescription>Last 20 measurements (req/s)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  name="Requests/sec"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Aggregated Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Aggregated metrics for the last hour</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aggregatedMetrics.map((agg) => (
              <div key={agg.type} className="flex items-center justify-between border-b border-border pb-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium capitalize">{agg.type.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {agg.count} measurements
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">
                    Avg: {agg.avg.toFixed(2)} | Min: {agg.min.toFixed(2)} | Max: {agg.max.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Feedback Loop */}
      <Card>
        <CardHeader>
          <CardTitle>AI Feedback Loop Status</CardTitle>
          <CardDescription>Real-time AI model performance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Model Accuracy</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{kpis.aiAccuracy.toFixed(1)}%</span>
                {getStatusBadge(kpis.aiAccuracy, 85)}
              </div>
            </div>
            <Progress value={kpis.aiAccuracy} className="h-2" />
            <p className="text-xs text-muted-foreground">
              AI predictions are continuously validated against actual outcomes. 
              Accuracy above 85% indicates healthy model performance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
