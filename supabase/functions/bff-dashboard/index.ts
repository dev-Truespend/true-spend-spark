import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Security headers configuration
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=(self), payment=(self)',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  const startTime = performance.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all dashboard data in parallel for optimal performance
    const [transactions, budgets, alerts, geofences, patterns] = await Promise.all([
      // Recent transactions (last 30 days)
      supabase
        .from('transactions')
        .select('*, merchant:merchants(*), geofence:geofences(*)')
        .eq('user_id', user.id)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(50),

      // Active budgets with spending data
      supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true),

      // Unacknowledged budget alerts
      supabase
        .from('budget_alerts')
        .select('*, budget:budgets(*)')
        .eq('user_id', user.id)
        .is('acknowledged_at', null)
        .order('triggered_at', { ascending: false })
        .limit(10),

      // Active geofences
      supabase
        .from('geofences')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true),

      // Cached spending patterns
      supabase
        .from('spending_patterns')
        .select('*')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .limit(5),
    ]);

    if (transactions.error) throw transactions.error;
    if (budgets.error) throw budgets.error;
    if (alerts.error) throw alerts.error;
    if (geofences.error) throw geofences.error;

    // Calculate spending summary
    const totalSpent = transactions.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const avgTransaction = transactions.data?.length ? totalSpent / transactions.data.length : 0;

    // Calculate budget utilization
    const budgetSummary = budgets.data?.map(budget => {
      const spent = transactions.data
        ?.filter(t => {
          if (budget.geofence_id) return t.geofence_id === budget.geofence_id;
          return t.category === budget.category;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      return {
        ...budget,
        spent,
        remaining: Number(budget.limit_amount) - spent,
        utilization: (spent / Number(budget.limit_amount)) * 100,
      };
    });

    const responseTime = performance.now() - startTime;

    // Log API request for analytics
    await supabase.from('api_request_log').insert({
      user_id: user.id,
      endpoint: '/bff-dashboard',
      method: 'GET',
      response_time_ms: Math.round(responseTime),
      cache_hit: patterns.data && patterns.data.length > 0,
      status_code: 200,
    });

    return new Response(
      JSON.stringify({
        transactions: transactions.data,
        budgets: budgetSummary,
        alerts: alerts.data,
        geofences: geofences.data,
        patterns: patterns.data || [],
        summary: {
          totalSpent,
          avgTransaction,
          transactionCount: transactions.data?.length || 0,
          activeBudgets: budgets.data?.length || 0,
          alertCount: alerts.data?.length || 0,
        },
        meta: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          cached: patterns.data && patterns.data.length > 0,
        },
      }),
      {
        headers: { 
          ...corsHeaders,
          ...securityHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60',
          'X-Response-Time': `${Math.round(responseTime)}ms`,
        },
      }
    );
  } catch (error) {
    console.error('BFF Dashboard error:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});