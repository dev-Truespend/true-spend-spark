/**
 * Phase 10: Observability - Real-time Metrics Dashboard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { Activity, Cpu, Database, Zap, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Progress } from '@/shared/components/ui/progress';

interface AggregatedMetrics {
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    active_connections: number;
  };
  api: {
    requests_per_minute: number;
    avg_response_time: number;
    error_rate: number;
    p95_latency: number;
  };
  database: {
    active_queries: number;
    slow_queries: number;
    connection_pool_usage: number;
    cache_hit_rate: number;
  };
  edge_functions: {
    invocations_per_minute: number;
    avg_execution_time: number;
    error_rate: number;
    cold_starts: number;
  };
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const { toast } = useToast();

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('metrics-collector', {
        body: { action: 'aggregate', timeRange },
      });

      if (error) throw error;
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load metrics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-destructive';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusBadge = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <Badge variant="destructive">Critical</Badge>;
    if (value >= thresholds.warning) return <Badge className="bg-yellow-500">Warning</Badge>;
    return <Badge className="bg-green-500">Healthy</Badge>;
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-time Metrics</h2>
          <p className="text-muted-foreground">Monitor system performance and health</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">Last 5 minutes</SelectItem>
              <SelectItem value="15m">Last 15 minutes</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadMetrics} variant="outline" size="icon">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* System Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                System Resources
              </CardTitle>
              <CardDescription>CPU, memory, disk, and connection metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU Usage</span>
                    {getStatusBadge(metrics.system.cpu_usage, { warning: 70, critical: 90 })}
                  </div>
                  <Progress value={metrics.system.cpu_usage} className="h-2" />
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.system.cpu_usage, { warning: 70, critical: 90 })}`}>
                    {metrics.system.cpu_usage.toFixed(1)}%
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    {getStatusBadge(metrics.system.memory_usage, { warning: 75, critical: 90 })}
                  </div>
                  <Progress value={metrics.system.memory_usage} className="h-2" />
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.system.memory_usage, { warning: 75, critical: 90 })}`}>
                    {metrics.system.memory_usage.toFixed(1)}%
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disk Usage</span>
                    {getStatusBadge(metrics.system.disk_usage, { warning: 80, critical: 95 })}
                  </div>
                  <Progress value={metrics.system.disk_usage} className="h-2" />
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.system.disk_usage, { warning: 80, critical: 95 })}`}>
                    {metrics.system.disk_usage.toFixed(1)}%
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Connections</span>
                    <Badge variant="outline">{metrics.system.active_connections}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{metrics.system.active_connections}</p>
                  <p className="text-xs text-muted-foreground">Database connections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                API Performance
              </CardTitle>
              <CardDescription>Request throughput, latency, and error rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Requests/min</span>
                  <p className="text-2xl font-bold">{metrics.api.requests_per_minute}</p>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">Active traffic</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Avg Response Time</span>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.api.avg_response_time, { warning: 500, critical: 1000 })}`}>
                    {metrics.api.avg_response_time}ms
                  </p>
                  {getStatusBadge(metrics.api.avg_response_time, { warning: 500, critical: 1000 })}
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">P95 Latency</span>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.api.p95_latency, { warning: 1000, critical: 2000 })}`}>
                    {metrics.api.p95_latency}ms
                  </p>
                  <p className="text-xs text-muted-foreground">95th percentile</p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Error Rate</span>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.api.error_rate, { warning: 1, critical: 5 })}`}>
                    {metrics.api.error_rate.toFixed(2)}%
                  </p>
                  {getStatusBadge(metrics.api.error_rate, { warning: 1, critical: 5 })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Performance
              </CardTitle>
              <CardDescription>Query performance and cache efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Active Queries</span>
                  <p className="text-2xl font-bold">{metrics.database.active_queries}</p>
                  <Badge variant="outline">Real-time</Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Slow Queries</span>
                  <p className={`text-2xl font-bold ${metrics.database.slow_queries > 0 ? 'text-yellow-500' : ''}`}>
                    {metrics.database.slow_queries}
                  </p>
                  <p className="text-xs text-muted-foreground">&gt;1s execution</p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Connection Pool</span>
                  <p className="text-2xl font-bold">{metrics.database.connection_pool_usage}</p>
                  <p className="text-xs text-muted-foreground">Pool utilization</p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                  <p className="text-2xl font-bold text-green-500">{metrics.database.cache_hit_rate.toFixed(1)}%</p>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">Efficient caching</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edge Functions Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Edge Functions
              </CardTitle>
              <CardDescription>Function invocations and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Invocations/min</span>
                  <p className="text-2xl font-bold">{metrics.edge_functions.invocations_per_minute}</p>
                  <Badge variant="outline">Throughput</Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Avg Execution</span>
                  <p className="text-2xl font-bold">{metrics.edge_functions.avg_execution_time}ms</p>
                  <p className="text-xs text-muted-foreground">Function runtime</p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Error Rate</span>
                  <p className={`text-2xl font-bold ${getStatusColor(metrics.edge_functions.error_rate, { warning: 1, critical: 5 })}`}>
                    {metrics.edge_functions.error_rate.toFixed(2)}%
                  </p>
                  {getStatusBadge(metrics.edge_functions.error_rate, { warning: 1, critical: 5 })}
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Cold Starts</span>
                  <p className="text-2xl font-bold">{metrics.edge_functions.cold_starts}</p>
                  <p className="text-xs text-muted-foreground">Last period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
