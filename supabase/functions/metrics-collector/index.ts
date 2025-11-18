/**
 * Phase 10: Observability - Metrics Collector
 * Collects and aggregates system metrics in real-time
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricData {
  timestamp: string;
  metric_name: string;
  value: number;
  labels?: Record<string, string>;
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'aggregate';
    const timeRange = url.searchParams.get('timeRange') || '1h';

    if (action === 'record' && req.method === 'POST') {
      // Record a new metric
      const metricData: MetricData = await req.json();
      
      const { error: insertError } = await supabaseClient
        .from('system_metrics')
        .insert({
          metric_name: metricData.metric_name,
          value: metricData.value,
          labels: metricData.labels || {},
          timestamp: metricData.timestamp || new Date().toISOString(),
        });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'aggregate') {
      // Calculate time window
      const now = new Date();
      const intervals: Record<string, number> = {
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
      };
      
      const interval = intervals[timeRange] || intervals['1h'];
      const startTime = new Date(now.getTime() - interval).toISOString();

      // Fetch API metrics
      const { data: apiLogs } = await supabaseClient
        .from('api_request_log')
        .select('response_time_ms, status_code, created_at')
        .gte('created_at', startTime)
        .order('created_at', { ascending: false });

      // Fetch system metrics
      const { data: systemMetrics } = await supabaseClient
        .from('system_metrics')
        .select('*')
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: false });

      // Calculate API metrics
      const totalRequests = apiLogs?.length || 0;
      const errorRequests = apiLogs?.filter(log => log.status_code >= 400).length || 0;
      const responseTimes = apiLogs?.map(log => log.response_time_ms).filter(Boolean) || [];
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
      
      // Calculate P95 latency
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95Latency = sortedTimes[p95Index] || 0;

      // Calculate requests per minute
      const minutesInRange = interval / (60 * 1000);
      const requestsPerMinute = totalRequests / minutesInRange;

      // Aggregate system metrics
      const cpuMetrics = systemMetrics?.filter(m => m.metric_name === 'cpu_usage') || [];
      const memoryMetrics = systemMetrics?.filter(m => m.metric_name === 'memory_usage') || [];
      const diskMetrics = systemMetrics?.filter(m => m.metric_name === 'disk_usage') || [];
      const connectionMetrics = systemMetrics?.filter(m => m.metric_name === 'active_connections') || [];

      const getLatestValue = (metrics: any[]) => 
        metrics.length > 0 ? metrics[0].value : 0;

      // Fetch edge function metrics (from event_log)
      const { data: functionLogs } = await supabaseClient
        .from('event_log')
        .select('*')
        .gte('created_at', startTime)
        .order('created_at', { ascending: false });

      const totalInvocations = functionLogs?.length || 0;
      const functionErrors = functionLogs?.filter(log => log.status === 'failed').length || 0;
      const invocationsPerMinute = totalInvocations / minutesInRange;

      // Fetch cache metrics
      const { data: cacheMetrics } = await supabaseClient
        .from('cache_analytics')
        .select('*')
        .gte('timestamp', startTime);

      const totalCacheOps = cacheMetrics?.length || 0;
      const cacheHits = cacheMetrics?.filter(m => m.operation === 'hit').length || 0;
      const cacheHitRate = totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0;

      const metrics: AggregatedMetrics = {
        system: {
          cpu_usage: getLatestValue(cpuMetrics),
          memory_usage: getLatestValue(memoryMetrics),
          disk_usage: getLatestValue(diskMetrics),
          active_connections: getLatestValue(connectionMetrics),
        },
        api: {
          requests_per_minute: Math.round(requestsPerMinute * 100) / 100,
          avg_response_time: Math.round(avgResponseTime),
          error_rate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
          p95_latency: Math.round(p95Latency),
        },
        database: {
          active_queries: 0, // Would need pg_stat_activity access
          slow_queries: 0, // Would need query log analysis
          connection_pool_usage: getLatestValue(connectionMetrics),
          cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
        },
        edge_functions: {
          invocations_per_minute: Math.round(invocationsPerMinute * 100) / 100,
          avg_execution_time: 0, // Calculate from function logs if available
          error_rate: totalInvocations > 0 ? (functionErrors / totalInvocations) * 100 : 0,
          cold_starts: 0, // Would need function runtime metrics
        },
      };

      return new Response(
        JSON.stringify({ metrics, timeRange }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'timeseries') {
      // Return time-series data for charts
      const metricName = url.searchParams.get('metric') || 'cpu_usage';
      const now = new Date();
      const intervals: Record<string, number> = {
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
      };
      
      const interval = intervals[timeRange] || intervals['1h'];
      const startTime = new Date(now.getTime() - interval).toISOString();

      const { data: metricsData, error: metricsError } = await supabaseClient
        .from('system_metrics')
        .select('*')
        .eq('metric_name', metricName)
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true });

      if (metricsError) throw metricsError;

      return new Response(
        JSON.stringify({ data: metricsData || [], timeRange }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in metrics-collector:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
