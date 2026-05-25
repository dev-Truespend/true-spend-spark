// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  Clock,
  Gauge
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BatchMetrics {
  batch_size: number;
  processing_time_ms: number;
  throughput_eps: number;
  event_rate: number;
  timestamp: string;
}

export function BatchMetricsDashboard() {
  // Query recent batch processing metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['batch-metrics'],
    queryFn: async () => {
      // In production, this would query a batch_metrics table
      // For now, we'll simulate data
      const mockMetrics: BatchMetrics[] = Array.from({ length: 20 }, (_, i) => ({
        batch_size: Math.floor(Math.random() * 100) + 10,
        processing_time_ms: Math.floor(Math.random() * 500) + 50,
        throughput_eps: Math.floor(Math.random() * 50) + 10,
        event_rate: Math.floor(Math.random() * 60) + 5,
        timestamp: new Date(Date.now() - (19 - i) * 60 * 1000).toISOString(),
      }));
      return mockMetrics;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate current stats
  const latestMetrics = metrics?.[metrics.length - 1];
  const avgBatchSize = metrics?.reduce((sum, m) => sum + m.batch_size, 0) / (metrics?.length || 1);
  const avgProcessingTime = metrics?.reduce((sum, m) => sum + m.processing_time_ms, 0) / (metrics?.length || 1);
  const avgThroughput = metrics?.reduce((sum, m) => sum + m.throughput_eps, 0) / (metrics?.length || 1);

  // Determine batch mode based on current event rate
  const getBatchMode = (rate: number) => {
    if (rate < 10) return { label: 'Low Traffic', variant: 'secondary' as const, color: 'text-blue-500' };
    if (rate < 50) return { label: 'Medium Traffic', variant: 'default' as const, color: 'text-yellow-500' };
    if (rate < 100) return { label: 'High Traffic', variant: 'default' as const, color: 'text-orange-500' };
    return { label: 'Very High Traffic', variant: 'destructive' as const, color: 'text-red-500' };
  };

  const currentMode = latestMetrics ? getBatchMode(latestMetrics.event_rate) : { label: 'Unknown', variant: 'secondary' as const, color: 'text-gray-500' };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading metrics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Adaptive Batch Processing</CardTitle>
                <CardDescription>
                  Dynamic batch sizing based on event load
                </CardDescription>
              </div>
            </div>
            <Badge variant={currentMode.variant} className={currentMode.color}>
              {currentMode.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Current Event Rate */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Event Rate
              </div>
              <p className="text-2xl font-bold">
                {latestMetrics?.event_rate.toFixed(1) || 0} <span className="text-sm font-normal text-muted-foreground">eps</span>
              </p>
            </div>

            {/* Current Batch Size */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Batch Size
              </div>
              <p className="text-2xl font-bold">
                {latestMetrics?.batch_size || 0}
              </p>
            </div>

            {/* Processing Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Processing Time
              </div>
              <p className="text-2xl font-bold">
                {latestMetrics?.processing_time_ms || 0} <span className="text-sm font-normal text-muted-foreground">ms</span>
              </p>
            </div>

            {/* Throughput */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Throughput
              </div>
              <p className="text-2xl font-bold">
                {latestMetrics?.throughput_eps.toFixed(1) || 0} <span className="text-sm font-normal text-muted-foreground">eps</span>
              </p>
            </div>
          </div>

          {/* Efficiency Indicator */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing Efficiency</span>
              <span className="font-medium">
                {latestMetrics ? Math.min(100, Math.round((latestMetrics.throughput_eps / latestMetrics.event_rate) * 100)) : 0}%
              </span>
            </div>
            <Progress 
              value={latestMetrics ? Math.min(100, (latestMetrics.throughput_eps / latestMetrics.event_rate) * 100) : 0} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Performance Over Time</CardTitle>
          <CardDescription>Last 20 minutes of batch processing metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleString()}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="event_rate" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Event Rate (eps)"
              />
              <Line 
                type="monotone" 
                dataKey="throughput_eps" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="Throughput (eps)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Batch Size Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Adaptive Batch Sizing</CardTitle>
          <CardDescription>How batch size adapts to event load</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleString()}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Line 
                type="stepAfter" 
                dataKey="batch_size" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                name="Batch Size"
              />
              <Line 
                type="monotone" 
                dataKey="processing_time_ms" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2}
                name="Processing Time (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Average Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Average Performance (Last 20min)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Batch Size</p>
              <p className="text-2xl font-bold">{avgBatchSize.toFixed(0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Processing Time</p>
              <p className="text-2xl font-bold">{avgProcessingTime.toFixed(0)} ms</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Throughput</p>
              <p className="text-2xl font-bold">{avgThroughput.toFixed(1)} eps</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
