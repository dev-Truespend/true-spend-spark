/**
 * Phase 10: Performance Dashboard Page
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { toast } from '@/shared/hooks/use-toast';
import { Activity, TrendingUp, Database, Zap, RefreshCw } from 'lucide-react';
import { RedisCacheMonitor } from '@/features/ml/components/RedisCacheMonitor';

export default function Performance() {
  const [timeWindow, setTimeWindow] = useState('24h');

  const { data: performanceData, isLoading, refetch } = useQuery({
    queryKey: ['performance-analysis', timeWindow],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('performance-analyzer', {
        body: { timeWindow },
      });

      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Refreshing',
      description: 'Performance analysis updated',
    });
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 500) return 'text-green-500';
    if (latency < 1000) return 'text-yellow-500';
    if (latency < 2000) return 'text-orange-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Analyzing performance...
          </CardContent>
        </Card>
      </div>
    );
  }

  const analysis = performanceData?.analysis;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analysis</h1>
          <p className="text-muted-foreground">
            System performance metrics and optimization recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Redis Cache Metrics */}
      <RedisCacheMonitor />

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis?.recommendations?.map((rec: string, index: number) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <span className="text-lg">{rec.match(/^[⚠️🔴📦🗄️✅]/)?.[0]}</span>
              <p className="text-sm flex-1">{rec.replace(/^[⚠️🔴📦🗄️✅]\s*/, '')}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cache Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cache Efficiency
          </CardTitle>
          <CardDescription>
            Cache hit rates by type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Hit Rate</span>
              <span className="font-bold">
                {analysis?.cache_metrics?.overall_hit_rate?.toFixed(1)}%
              </span>
            </div>
            <Progress value={analysis?.cache_metrics?.overall_hit_rate || 0} />
          </div>

          <div className="space-y-3 pt-3">
            {analysis?.cache_metrics?.by_cache_type &&
              Object.entries(analysis.cache_metrics.by_cache_type).map(
                ([type, metrics]: [string, any]) => (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline">{type}</Badge>
                      <span className="text-muted-foreground">
                        {metrics.hits} / {metrics.total} hits ({metrics.hit_rate.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={metrics.hit_rate} />
                  </div>
                )
              )}
          </div>
        </CardContent>
      </Card>

      {/* Slow Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Slowest API Endpoints
          </CardTitle>
          <CardDescription>
            Top 20 endpoints ranked by P95 latency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">P50</TableHead>
                <TableHead className="text-right">P95</TableHead>
                <TableHead className="text-right">P99</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis?.slow_endpoints?.map((endpoint: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">{endpoint.endpoint}</TableCell>
                  <TableCell className="text-right">{endpoint.request_count}</TableCell>
                  <TableCell className={`text-right ${getLatencyColor(endpoint.p50_latency)}`}>
                    {endpoint.p50_latency}ms
                  </TableCell>
                  <TableCell className={`text-right font-bold ${getLatencyColor(endpoint.p95_latency)}`}>
                    {endpoint.p95_latency}ms
                  </TableCell>
                  <TableCell className={`text-right ${getLatencyColor(endpoint.p99_latency)}`}>
                    {endpoint.p99_latency}ms
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={endpoint.error_rate > 5 ? 'destructive' : 'outline'}
                    >
                      {endpoint.error_rate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Database Performance */}
      {analysis?.database_performance?.slow_queries?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Slow Database Queries
            </CardTitle>
            <CardDescription>
              Queries taking longer than 1 second
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.database_performance.slow_queries.map((query: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs max-w-md truncate">
                      {query.query}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-500">
                      {query.duration_ms}ms
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(query.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
