/**
 * Phase 10: Performance Analyzer Edge Function
 * Analyzes system performance and provides optimization recommendations
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlowQuery {
  query: string;
  avg_duration_ms: number;
  execution_count: number;
  last_execution: string;
}

interface EndpointMetric {
  endpoint: string;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  request_count: number;
  error_rate: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { timeWindow = '24h' } = await req.json();
    const hours = timeWindow === '24h' ? 24 : timeWindow === '7d' ? 168 : 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Analyze slow API requests
    const slowEndpoints = await analyzeSlowEndpoints(supabase, startTime);

    // Analyze cache efficiency
    const cacheMetrics = await analyzeCacheEfficiency(supabase, startTime);

    // Analyze database performance (from logs)
    const dbPerformance = await analyzeDatabasePerformance(supabase, startTime);

    // Generate optimization recommendations
    const recommendations = generateRecommendations(
      slowEndpoints,
      cacheMetrics,
      dbPerformance
    );

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          slow_endpoints: slowEndpoints,
          cache_metrics: cacheMetrics,
          database_performance: dbPerformance,
          recommendations,
        },
        timeWindow,
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in performance-analyzer:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function analyzeSlowEndpoints(
  supabase: any,
  startTime: string
): Promise<EndpointMetric[]> {
  const { data: apiLogs } = await supabase
    .from('api_request_log')
    .select('endpoint, response_time_ms, status_code')
    .gte('created_at', startTime)
    .not('response_time_ms', 'is', null);

  if (!apiLogs || apiLogs.length === 0) return [];

  // Group by endpoint
  const endpointMap = new Map<string, number[]>();
  const endpointErrors = new Map<string, number>();
  const endpointCounts = new Map<string, number>();

  for (const log of apiLogs) {
    const endpoint = log.endpoint;
    if (!endpointMap.has(endpoint)) {
      endpointMap.set(endpoint, []);
      endpointErrors.set(endpoint, 0);
      endpointCounts.set(endpoint, 0);
    }

    endpointMap.get(endpoint)!.push(log.response_time_ms);
    endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + 1);

    if (log.status_code >= 400) {
      endpointErrors.set(endpoint, (endpointErrors.get(endpoint) || 0) + 1);
    }
  }

  // Calculate percentiles for each endpoint
  const metrics: EndpointMetric[] = [];
  for (const [endpoint, latencies] of endpointMap.entries()) {
    const sorted = latencies.sort((a, b) => a - b);
    const count = sorted.length;

    metrics.push({
      endpoint,
      p50_latency: sorted[Math.floor(count * 0.5)],
      p95_latency: sorted[Math.floor(count * 0.95)],
      p99_latency: sorted[Math.floor(count * 0.99)],
      request_count: endpointCounts.get(endpoint) || 0,
      error_rate: ((endpointErrors.get(endpoint) || 0) / count) * 100,
    });
  }

  // Sort by p95 latency and return top 20
  return metrics.sort((a, b) => b.p95_latency - a.p95_latency).slice(0, 20);
}

async function analyzeCacheEfficiency(
  supabase: any,
  startTime: string
): Promise<any> {
  const { data: cacheData } = await supabase
    .from('cache_analytics')
    .select('*')
    .gte('timestamp', startTime);

  if (!cacheData || cacheData.length === 0) {
    return {
      overall_hit_rate: 0,
      by_cache_type: {},
      total_requests: 0,
      total_hits: 0,
      total_misses: 0,
    };
  }

  const hitsByType = new Map<string, number>();
  const totalByType = new Map<string, number>();
  let totalHits = 0;
  let totalMisses = 0;

  for (const entry of cacheData) {
    const cacheType = entry.cache_type;
    const isHit = entry.operation === 'hit';

    if (!totalByType.has(cacheType)) {
      totalByType.set(cacheType, 0);
      hitsByType.set(cacheType, 0);
    }

    totalByType.set(cacheType, (totalByType.get(cacheType) || 0) + 1);

    if (isHit) {
      hitsByType.set(cacheType, (hitsByType.get(cacheType) || 0) + 1);
      totalHits++;
    } else {
      totalMisses++;
    }
  }

  const byCacheType: Record<string, any> = {};
  for (const [type, total] of totalByType.entries()) {
    const hits = hitsByType.get(type) || 0;
    byCacheType[type] = {
      hit_rate: (hits / total) * 100,
      hits,
      misses: total - hits,
      total,
    };
  }

  return {
    overall_hit_rate:
      (totalHits / (totalHits + totalMisses)) * 100,
    by_cache_type: byCacheType,
    total_requests: totalHits + totalMisses,
    total_hits: totalHits,
    total_misses: totalMisses,
  };
}

async function analyzeDatabasePerformance(
  supabase: any,
  startTime: string
): Promise<any> {
  const { data: dbLogs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('component', 'database')
    .gte('timestamp', startTime);

  if (!dbLogs || dbLogs.length === 0) {
    return {
      slow_queries: [],
      connection_pool_usage: 0,
      query_count: 0,
    };
  }

  // Extract slow queries from logs
  const slowQueries: any[] = [];
  for (const log of dbLogs) {
    if (log.metadata?.duration_ms && log.metadata.duration_ms > 1000) {
      slowQueries.push({
        query: log.metadata.query || 'Unknown',
        duration_ms: log.metadata.duration_ms,
        timestamp: log.timestamp,
      });
    }
  }

  return {
    slow_queries: slowQueries.sort((a, b) => b.duration_ms - a.duration_ms).slice(0, 10),
    query_count: dbLogs.length,
    avg_query_time: dbLogs.reduce((acc: number, log: any) => acc + (log.metadata?.duration_ms || 0), 0) / dbLogs.length,
  };
}

function generateRecommendations(
  slowEndpoints: EndpointMetric[],
  cacheMetrics: any,
  dbPerformance: any
): string[] {
  const recommendations: string[] = [];

  // Endpoint recommendations
  const criticalEndpoints = slowEndpoints.filter(e => e.p95_latency > 2000);
  if (criticalEndpoints.length > 0) {
    recommendations.push(
      `⚠️ ${criticalEndpoints.length} endpoints have P95 latency > 2s. Consider optimization or caching.`
    );
  }

  const highErrorRateEndpoints = slowEndpoints.filter(e => e.error_rate > 5);
  if (highErrorRateEndpoints.length > 0) {
    recommendations.push(
      `🔴 ${highErrorRateEndpoints.length} endpoints have error rate > 5%. Investigate error handling.`
    );
  }

  // Cache recommendations
  if (cacheMetrics.overall_hit_rate < 70) {
    recommendations.push(
      `📦 Overall cache hit rate is ${cacheMetrics.overall_hit_rate.toFixed(1)}%. Consider increasing cache TTL or warming strategies.`
    );
  }

  // Database recommendations
  if (dbPerformance.slow_queries.length > 0) {
    recommendations.push(
      `🗄️ ${dbPerformance.slow_queries.length} slow queries detected (>1s). Review query optimization and add indexes.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System performance is optimal. No immediate optimizations needed.');
  }

  return recommendations;
}
