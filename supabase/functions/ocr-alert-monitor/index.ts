// Alert monitoring system for OCR cost and rate limit violations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  dailyCostThreshold: number;
  hourlyCostThreshold: number;
  failureRateThreshold: number;
  rateLimitThreshold: number;
}

const DEFAULT_CONFIG: AlertConfig = {
  dailyCostThreshold: 4.0, // Alert at $4 (before $5 limit)
  hourlyCostThreshold: 0.5, // Alert at $0.50/hour
  failureRateThreshold: 0.3, // Alert at 30% failure rate
  rateLimitThreshold: 45, // Alert at 45 of 50 requests
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Alert Monitor] Starting monitoring check...');
    
    const alerts: any[] = [];
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    // Check daily costs per user
    const { data: dailyCosts } = await supabase
      .from('google_vision_cost_tracking')
      .select('user_id, estimated_cost_usd')
      .gte('created_at', dayAgo);

    if (dailyCosts) {
      const userDailyCosts = dailyCosts.reduce((acc, log) => {
        acc[log.user_id] = (acc[log.user_id] || 0) + (log.estimated_cost_usd || 0);
        return acc;
      }, {} as Record<string, number>);

      for (const [userId, cost] of Object.entries(userDailyCosts)) {
        if (cost >= DEFAULT_CONFIG.dailyCostThreshold) {
          alerts.push({
            type: 'DAILY_COST_WARNING',
            severity: cost >= 5 ? 'critical' : 'warning',
            userId,
            message: `User approaching daily cost limit: $${cost.toFixed(2)}/$5.00`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Check hourly costs
    const { data: hourlyCosts } = await supabase
      .from('google_vision_cost_tracking')
      .select('user_id, estimated_cost_usd')
      .gte('created_at', hourAgo);

    if (hourlyCosts) {
      const userHourlyCosts = hourlyCosts.reduce((acc, log) => {
        acc[log.user_id] = (acc[log.user_id] || 0) + (log.estimated_cost_usd || 0);
        return acc;
      }, {} as Record<string, number>);

      for (const [userId, cost] of Object.entries(userHourlyCosts)) {
        if (cost >= DEFAULT_CONFIG.hourlyCostThreshold) {
          alerts.push({
            type: 'HOURLY_COST_SPIKE',
            severity: 'warning',
            userId,
            message: `High hourly cost detected: $${cost.toFixed(2)}/hour`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Check failure rates
    const { data: recentAttempts } = await supabase
      .from('google_vision_cost_tracking')
      .select('user_id, success')
      .gte('created_at', hourAgo);

    if (recentAttempts && recentAttempts.length > 0) {
      const userFailures = recentAttempts.reduce((acc, log) => {
        if (!acc[log.user_id]) {
          acc[log.user_id] = { total: 0, failures: 0 };
        }
        acc[log.user_id].total++;
        if (!log.success) acc[log.user_id].failures++;
        return acc;
      }, {} as Record<string, { total: number; failures: number }>);

      for (const [userId, stats] of Object.entries(userFailures)) {
        const failureRate = stats.failures / stats.total;
        if (failureRate >= DEFAULT_CONFIG.failureRateThreshold) {
          alerts.push({
            type: 'HIGH_FAILURE_RATE',
            severity: failureRate > 0.5 ? 'critical' : 'warning',
            userId,
            message: `High OCR failure rate: ${(failureRate * 100).toFixed(1)}% (${stats.failures}/${stats.total} requests)`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Check rate limit usage
    const { data: rateLimits } = await supabase
      .from('rate_limits')
      .select('user_id, request_count')
      .gte('window_start', hourAgo);

    if (rateLimits) {
      for (const limit of rateLimits) {
        if (limit.request_count >= DEFAULT_CONFIG.rateLimitThreshold) {
          alerts.push({
            type: 'RATE_LIMIT_WARNING',
            severity: 'warning',
            userId: limit.user_id,
            message: `User approaching rate limit: ${limit.request_count}/50 requests`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Log all alerts
    if (alerts.length > 0) {
      console.log(`[Alert Monitor] Generated ${alerts.length} alerts:`, JSON.stringify(alerts, null, 2));
    } else {
      console.log('[Alert Monitor] No alerts generated - all metrics normal');
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertCount: alerts.length,
        alerts,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Alert Monitor] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
