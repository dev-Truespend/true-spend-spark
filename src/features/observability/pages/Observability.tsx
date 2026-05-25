/**
 * Phase 10: Observability & Polish - Observability Dashboard
 * Comprehensive system metrics dashboard with real-time updates
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, TrendingDown, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type TimeRange = '1h' | '24h' | '7d' | '30d';

interface Metric {
  metric_name: string;
  value: number;
  unit: string;
  timestamp: string;
}

export default function Observability() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [refreshing, setRefreshing] = useState(false);

  const getTimeRangeHours = (range: TimeRange): number => {
    switch (range) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const hours = getTimeRangeHours(timeRange);
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setMetrics((data || []) as Metric[]);

      // Get latest health score
      const latestHealth = (data || [])
        .filter(m => m.metric_name === 'system.health_score')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      if (latestHealth) {
        setHealthScore(latestHealth.value);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Set up realtime subscription for new metrics
    const channel = supabase
      .channel('system_metrics_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_metrics',
        },
        (payload) => {
          setMetrics((prev) => [...prev, payload.new as Metric]);
          
          // Update health score if it's a health metric
          if ((payload.new as Metric).metric_name === 'system.health_score') {
            setHealthScore((payload.new as Metric).value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  const refreshMetrics = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
    toast.success('Metrics refreshed');
  };

  // Prepare chart data
  const apiLatencyData = metrics
    .filter(m => ['api.latency.p50', 'api.latency.p95', 'api.latency.p99'].includes(m.metric_name))
    .reduce((acc, m) => {
      const timestamp = new Date(m.timestamp).toLocaleTimeString();
      const existing = acc.find(d => d.time === timestamp);
      if (existing) {
        existing[m.metric_name] = m.value;
      } else {
        acc.push({ time: timestamp, [m.metric_name]: m.value });
      }
      return acc;
    }, [] as any[]);

  const cacheHitRateData = metrics
    .filter(m => m.metric_name === 'cache.hit_rate')
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      hitRate: m.value,
    }));

  const errorRateData = metrics
    .filter(m => m.metric_name === 'api.error_rate')
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      errorRate: m.value,
    }));

  const securityData = metrics
    .filter(m => ['security.failed_logins', 'security.successful_logins'].includes(m.metric_name))
    .reduce((acc, m) => {
      const timestamp = new Date(m.timestamp).toLocaleTimeString();
      const existing = acc.find(d => d.time === timestamp);
      if (existing) {
        existing[m.metric_name === 'security.failed_logins' ? 'failed' : 'successful'] = m.value;
      } else {
        acc.push({
          time: timestamp,
          [m.metric_name === 'security.failed_logins' ? 'failed' : 'successful']: m.value,
        });
      }
      return acc;
    }, [] as any[]);

  // Get latest values
  const latestApiP95 = metrics
    .filter(m => m.metric_name === 'api.latency.p95')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.value || 0;

  const latestCacheHitRate = metrics
    .filter(m => m.metric_name === 'cache.hit_rate')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.value || 0;

  const latestErrorRate = metrics
    .filter(m => m.metric_name === 'api.error_rate')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.value || 0;

  const getHealthStatus = (score: number): { label: string; color: string; icon: any } => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle2 };
    if (score >= 70) return { label: 'Good', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Activity };
    if (score >= 50) return { label: 'Degraded', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertCircle };
    return { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertCircle };
  };

  const healthStatus = getHealthStatus(healthScore);
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Observability</h1>
          <p className="text-muted-foreground mt-1">
            Real-time system metrics and performance indicators
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshMetrics} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <HealthIcon className="w-8 h-8" />
              <div>
                <div className="text-3xl font-bold">{healthScore}</div>
                <Badge className={healthStatus.color}>{healthStatus.label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Latency (p95)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(latestApiP95)}ms</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              {latestApiP95 < 200 ? (
                <><TrendingDown className="w-4 h-4 text-green-600" /> Good</>
              ) : (
                <><TrendingUp className="w-4 h-4 text-red-600" /> High</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{latestCacheHitRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              {latestCacheHitRate >= 85 ? (
                <><TrendingUp className="w-4 h-4 text-green-600" /> Excellent</>
              ) : (
                <><TrendingDown className="w-4 h-4 text-yellow-600" /> Low</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{latestErrorRate.toFixed(2)}%</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              {latestErrorRate < 5 ? (
                <><TrendingDown className="w-4 h-4 text-green-600" /> Normal</>
              ) : (
                <><TrendingUp className="w-4 h-4 text-red-600" /> High</>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* API Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>API Latency Percentiles</CardTitle>
            <CardDescription>Response time distribution (p50, p95, p99)</CardDescription>
          </CardHeader>
          <CardContent>
            {apiLatencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={apiLatencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="api.latency.p50" stroke="#10b981" name="p50" />
                  <Line type="monotone" dataKey="api.latency.p95" stroke="#f59e0b" name="p95" />
                  <Line type="monotone" dataKey="api.latency.p99" stroke="#ef4444" name="p99" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected time range
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cache Hit Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Hit Rate</CardTitle>
            <CardDescription>Percentage of cache hits over time</CardDescription>
          </CardHeader>
          <CardContent>
            {cacheHitRateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cacheHitRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="hitRate" stroke="#3b82f6" fill="#93c5fd" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected time range
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>API Error Rate</CardTitle>
            <CardDescription>Percentage of failed requests over time</CardDescription>
          </CardHeader>
          <CardContent>
            {errorRateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={errorRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 'auto']} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="errorRate" stroke="#ef4444" fill="#fca5a5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected time range
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Events Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Events</CardTitle>
            <CardDescription>Successful vs failed login attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {securityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={securityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="successful" fill="#10b981" name="Successful" />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected time range
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
