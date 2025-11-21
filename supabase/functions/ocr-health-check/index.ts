// Health check endpoint for OCR services
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const checks: HealthStatus[] = [];
    const startTime = Date.now();

    // Check database connectivity
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from('google_vision_cost_tracking')
      .select('id')
      .limit(1);
    
    checks.push({
      service: 'database',
      status: dbError ? 'down' : 'healthy',
      responseTime: Date.now() - dbStart,
      error: dbError?.message,
    });

    // Check rate limit table
    const rlStart = Date.now();
    const { error: rlError } = await supabase
      .from('rate_limits')
      .select('id')
      .limit(1);
    
    checks.push({
      service: 'rate_limiter',
      status: rlError ? 'down' : 'healthy',
      responseTime: Date.now() - rlStart,
      error: rlError?.message,
    });

    // Check circuit breaker status by analyzing recent failures
    const cbStart = Date.now();
    const { data: recentLogs, error: cbError } = await supabase
      .from('google_vision_cost_tracking')
      .select('success, created_at')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const failureRate = recentLogs 
      ? recentLogs.filter(log => !log.success).length / recentLogs.length
      : 0;

    checks.push({
      service: 'google_vision_api',
      status: cbError ? 'down' : failureRate > 0.5 ? 'degraded' : 'healthy',
      responseTime: Date.now() - cbStart,
      error: cbError?.message || (failureRate > 0.5 ? `High failure rate: ${(failureRate * 100).toFixed(1)}%` : undefined),
    });

    // Check cost tracking and limits
    const costStart = Date.now();
    const { data: todayCosts, error: costError } = await supabase
      .from('google_vision_cost_tracking')
      .select('estimated_cost_usd, user_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const totalCostToday = todayCosts?.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0) || 0;
    const usersNearLimit = new Set(
      todayCosts?.reduce((acc, log) => {
        const userCost = todayCosts
          .filter(l => l.user_id === log.user_id)
          .reduce((sum, l) => sum + (l.estimated_cost_usd || 0), 0);
        if (userCost > 4) acc.push(log.user_id);
        return acc;
      }, [] as string[])
    ).size;

    checks.push({
      service: 'cost_tracking',
      status: costError ? 'down' : totalCostToday > 100 ? 'degraded' : 'healthy',
      responseTime: Date.now() - costStart,
      error: costError?.message,
    });

    const overallStatus = checks.some(c => c.status === 'down')
      ? 'down'
      : checks.some(c => c.status === 'degraded')
      ? 'degraded'
      : 'healthy';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalResponseTime: Date.now() - startTime,
      checks,
      metrics: {
        totalCostToday: `$${totalCostToday.toFixed(4)}`,
        usersNearLimit,
        failureRate: `${(failureRate * 100).toFixed(1)}%`,
      },
    };

    console.log('[Health Check]', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: overallStatus === 'down' ? 503 : 200,
    });
  } catch (error) {
    console.error('[Health Check] Error:', error);
    return new Response(
      JSON.stringify({
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      }
    );
  }
});
