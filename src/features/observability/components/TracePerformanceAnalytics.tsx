import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Clock, TrendingUp, AlertCircle, Activity } from 'lucide-react';

interface TraceStats {
  total_traces: number;
  completed_traces: number;
  error_traces: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  error_rate: number;
}

export function TracePerformanceAnalytics() {
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    fetchStatistics();
    fetchHistoricalData();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trace_statistics', {
        p_start_time: getStartTime(timeRange),
        p_end_time: new Date().toISOString(),
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching trace statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const { data, error } = await supabase
        .from('traces')
        .select('operation_name, duration_ms, started_at, status')
        .gte('started_at', getStartTime(timeRange))
        .order('started_at', { ascending: true });

      if (error) throw error;

      // Group by 5-minute intervals
      const grouped = groupByInterval(data || [], 5);
      setHistoricalData(grouped);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const getStartTime = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '15m':
        return new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    }
  };

  const groupByInterval = (data: any[], intervalMinutes: number) => {
    const groups: { [key: string]: { count: number; avgDuration: number; errors: number } } = {};
    
    data.forEach(item => {
      const date = new Date(item.started_at);
      const intervalKey = new Date(
        Math.floor(date.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000)
      ).toISOString();

      if (!groups[intervalKey]) {
        groups[intervalKey] = { count: 0, avgDuration: 0, errors: 0 };
      }

      groups[intervalKey].count++;
      groups[intervalKey].avgDuration += item.duration_ms || 0;
      if (item.status === 'error') {
        groups[intervalKey].errors++;
      }
    });

    return Object.entries(groups).map(([time, data]) => ({
      time: new Date(time).toLocaleTimeString(),
      count: data.count,
      avgDuration: Math.round(data.avgDuration / data.count),
      errorRate: Math.round((data.errors / data.count) * 100),
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading performance analytics...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No trace data available
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Performance Analytics</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15m">Last 15m</SelectItem>
            <SelectItem value="1h">Last 1h</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7d</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Traces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_traces}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completed_traces} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avg_duration_ms)}ms</div>
            <Progress value={(stats.avg_duration_ms / stats.p99_duration_ms) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              P95 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.p95_duration_ms)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              P99: {Math.round(stats.p99_duration_ms)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.error_rate.toFixed(2)}%</div>
            <Badge variant={stats.error_rate > 5 ? 'destructive' : 'default'} className="mt-1">
              {stats.error_traces} errors
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response Time Over Time</CardTitle>
            <CardDescription>Average duration per interval</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="avgDuration" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Volume</CardTitle>
            <CardDescription>Traces per interval</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>P50 Latency</span>
              <span className="font-mono">{Math.round(stats.p50_duration_ms)}ms / 30ms target</span>
            </div>
            <Progress value={(stats.p50_duration_ms / 30) * 100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>P95 Latency</span>
              <span className="font-mono">{Math.round(stats.p95_duration_ms)}ms / 65ms target</span>
            </div>
            <Progress value={(stats.p95_duration_ms / 65) * 100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Error Rate</span>
              <span className="font-mono">{stats.error_rate.toFixed(2)}% / 2% target</span>
            </div>
            <Progress value={(stats.error_rate / 2) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}