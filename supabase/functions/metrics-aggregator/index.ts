/**
 * Phase 10: Observability & Polish - Metrics Aggregator Edge Function
 * Scheduled hourly to aggregate system metrics from various sources
 * Calculates: API performance, cache hit rates, trace latencies, security events, etc.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[metrics-aggregator] Starting metrics aggregation...');

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 1. API Performance Metrics
    console.log('[metrics-aggregator] Aggregating API performance...');
    
    const { data: apiRequests, error: apiError } = await supabase
      .from('api_request_log')
      .select('response_time_ms, status_code')
      .gte('created_at', oneHourAgo.toISOString())
      .not('response_time_ms', 'is', null);

    if (!apiError && apiRequests && apiRequests.length > 0) {
      const responseTimes = apiRequests.map(r => r.response_time_ms).sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
      const avg = responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length;

      // Error rate
      const errorCount = apiRequests.filter(r => r.status_code && r.status_code >= 400).length;
      const errorRate = (errorCount / apiRequests.length) * 100;

      await supabase.from('system_metrics').insert([
        { metric_name: 'api.latency.p50', value: p50, unit: 'ms', tags: { period: 'hourly' } },
        { metric_name: 'api.latency.p95', value: p95, unit: 'ms', tags: { period: 'hourly' } },
        { metric_name: 'api.latency.p99', value: p99, unit: 'ms', tags: { period: 'hourly' } },
        { metric_name: 'api.latency.avg', value: Math.round(avg), unit: 'ms', tags: { period: 'hourly' } },
        { metric_name: 'api.error_rate', value: errorRate, unit: 'percent', tags: { period: 'hourly' } },
        { metric_name: 'api.request_count', value: apiRequests.length, unit: 'count', tags: { period: 'hourly' } },
      ]);

      console.log(`[metrics-aggregator] API metrics: p50=${p50}ms, p95=${p95}ms, error_rate=${errorRate.toFixed(2)}%`);
    }

    // 2. Cache Performance Metrics
    console.log('[metrics-aggregator] Aggregating cache performance...');
    
    const { data: cacheOps, error: cacheError } = await supabase
      .from('cache_analytics')
      .select('operation, cache_type, response_time_ms')
      .gte('timestamp', oneHourAgo.toISOString());

    if (!cacheError && cacheOps && cacheOps.length > 0) {
      const hitCount = cacheOps.filter(op => op.operation === 'hit').length;
      const missCount = cacheOps.filter(op => op.operation === 'miss').length;
      const totalOps = hitCount + missCount;
      const hitRate = totalOps > 0 ? (hitCount / totalOps) * 100 : 0;

      // Average cache response time
      const cacheTimes = cacheOps
        .filter(op => op.response_time_ms != null)
        .map(op => op.response_time_ms);
      const avgCacheTime = cacheTimes.length > 0
        ? cacheTimes.reduce((sum, val) => sum + val, 0) / cacheTimes.length
        : 0;

      await supabase.from('system_metrics').insert([
        { metric_name: 'cache.hit_rate', value: hitRate, unit: 'percent', tags: { period: 'hourly' } },
        { metric_name: 'cache.operations', value: totalOps, unit: 'count', tags: { period: 'hourly' } },
        { metric_name: 'cache.avg_response_time', value: Math.round(avgCacheTime), unit: 'ms', tags: { period: 'hourly' } },
      ]);

      console.log(`[metrics-aggregator] Cache metrics: hit_rate=${hitRate.toFixed(2)}%, ops=${totalOps}`);
    }

    // 3. Trace Performance Metrics
    console.log('[metrics-aggregator] Aggregating trace performance...');
    
    const { data: traces, error: traceError } = await supabase
      .from('traces')
      .select('duration_ms, status')
      .gte('started_at', oneHourAgo.toISOString())
      .not('duration_ms', 'is', null);

    if (!traceError && traces && traces.length > 0) {
      const durations = traces.map(t => t.duration_ms).sort((a, b) => a - b);
      const traceP95 = durations[Math.floor(durations.length * 0.95)];
      const errorTraces = traces.filter(t => t.status === 'error').length;
      const traceErrorRate = (errorTraces / traces.length) * 100;

      await supabase.from('system_metrics').insert([
        { metric_name: 'trace.latency.p95', value: traceP95, unit: 'ms', tags: { period: 'hourly' } },
        { metric_name: 'trace.error_rate', value: traceErrorRate, unit: 'percent', tags: { period: 'hourly' } },
        { metric_name: 'trace.count', value: traces.length, unit: 'count', tags: { period: 'hourly' } },
      ]);

      console.log(`[metrics-aggregator] Trace metrics: p95=${traceP95}ms, error_rate=${traceErrorRate.toFixed(2)}%`);
    }

    // 4. Security Events Metrics
    console.log('[metrics-aggregator] Aggregating security events...');
    
    const { data: authAttempts, error: authError } = await supabase
      .from('auth_attempts')
      .select('success')
      .gte('created_at', oneHourAgo.toISOString());

    if (!authError && authAttempts && authAttempts.length > 0) {
      const failedLogins = authAttempts.filter(a => !a.success).length;
      const successLogins = authAttempts.filter(a => a.success).length;
      const loginFailureRate = (failedLogins / authAttempts.length) * 100;

      await supabase.from('system_metrics').insert([
        { metric_name: 'security.failed_logins', value: failedLogins, unit: 'count', tags: { period: 'hourly' } },
        { metric_name: 'security.successful_logins', value: successLogins, unit: 'count', tags: { period: 'hourly' } },
        { metric_name: 'security.login_failure_rate', value: loginFailureRate, unit: 'percent', tags: { period: 'hourly' } },
      ]);

      console.log(`[metrics-aggregator] Security metrics: failed_logins=${failedLogins}, rate=${loginFailureRate.toFixed(2)}%`);
    }

    // 5. Geofence Performance Metrics
    console.log('[metrics-aggregator] Aggregating geofence metrics...');
    
    const { data: geofenceMetrics, error: geofenceError } = await supabase
      .from('geofence_metrics')
      .select('metric_name, value, unit')
      .gte('timestamp', oneHourAgo.toISOString());

    if (!geofenceError && geofenceMetrics && geofenceMetrics.length > 0) {
      const geofenceCount = geofenceMetrics.length;
      
      // Calculate average detection time if available
      const detectionMetrics = geofenceMetrics.filter(m => m.metric_name === 'detection_time_ms');
      if (detectionMetrics.length > 0) {
        const avgDetectionTime = detectionMetrics.reduce((sum, m) => sum + m.value, 0) / detectionMetrics.length;
        
        await supabase.from('system_metrics').insert([
          { metric_name: 'geofence.avg_detection_time', value: Math.round(avgDetectionTime), unit: 'ms', tags: { period: 'hourly' } },
          { metric_name: 'geofence.event_count', value: geofenceCount, unit: 'count', tags: { period: 'hourly' } },
        ]);

        console.log(`[metrics-aggregator] Geofence metrics: avg_detection=${Math.round(avgDetectionTime)}ms, events=${geofenceCount}`);
      }
    }

    // 6. System Health Score (composite metric)
    console.log('[metrics-aggregator] Calculating system health score...');
    
    const { data: recentMetrics } = await supabase
      .from('system_metrics')
      .select('metric_name, value')
      .gte('timestamp', oneHourAgo.toISOString())
      .in('metric_name', ['api.error_rate', 'cache.hit_rate', 'security.login_failure_rate']);

    if (recentMetrics && recentMetrics.length > 0) {
      const apiErrorRate = recentMetrics.find(m => m.metric_name === 'api.error_rate')?.value || 0;
      const cacheHitRate = recentMetrics.find(m => m.metric_name === 'cache.hit_rate')?.value || 100;
      const loginFailureRate = recentMetrics.find(m => m.metric_name === 'security.login_failure_rate')?.value || 0;

      // Health score: 0-100 (100 = perfect health)
      // Penalties: high error rates, low cache hit rate, high login failures
      let healthScore = 100;
      healthScore -= Math.min(apiErrorRate * 2, 40); // Max -40 for API errors
      healthScore -= Math.min((100 - cacheHitRate) * 0.5, 30); // Max -30 for low cache hits
      healthScore -= Math.min(loginFailureRate, 30); // Max -30 for login failures
      healthScore = Math.max(0, Math.round(healthScore));

      await supabase.from('system_metrics').insert({
        metric_name: 'system.health_score',
        value: healthScore,
        unit: 'score',
        tags: { period: 'hourly', version: '1.0' },
      });

      console.log(`[metrics-aggregator] System health score: ${healthScore}/100`);
    }

    console.log('[metrics-aggregator] Metrics aggregation complete');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Metrics aggregated successfully',
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[metrics-aggregator] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Metrics aggregation failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
