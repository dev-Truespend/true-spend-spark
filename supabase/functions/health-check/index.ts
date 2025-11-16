import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

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

  try {
    const url = new URL(req.url);
    const checkType = url.pathname.split('/').pop() || 'all';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
    };

    // Database health check
    if (checkType === 'all' || checkType === 'db') {
      const dbStart = Date.now();
      try {
        const { error } = await supabase.from('rate_limits').select('count').limit(1);
        const dbDuration = Date.now() - dbStart;
        
        results.checks.database = {
          status: error ? 'unhealthy' : 'healthy',
          responseTime: `${dbDuration}ms`,
          error: error?.message,
        };
        
        if (error) results.status = 'degraded';
      } catch (error) {
        results.checks.database = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        results.status = 'unhealthy';
      }
    }

    // Storage health check
    if (checkType === 'all' || checkType === 'storage') {
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        results.checks.storage = {
          status: error ? 'unhealthy' : 'healthy',
          bucketsCount: buckets?.length || 0,
          error: error?.message,
        };
        
        if (error) results.status = 'degraded';
      } catch (error) {
        results.checks.storage = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        results.status = 'unhealthy';
      }
    }

    // Auth health check
    if (checkType === 'all' || checkType === 'auth') {
      try {
        // Simple auth service check by trying to get current session
        const authStart = Date.now();
        await supabase.auth.getSession();
        const authDuration = Date.now() - authStart;
        
        results.checks.auth = {
          status: 'healthy',
          responseTime: `${authDuration}ms`,
        };
      } catch (error) {
        results.checks.auth = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        results.status = 'unhealthy';
      }
    }

    // Edge Functions health (self-check)
    if (checkType === 'all' || checkType === 'functions') {
      results.checks.edgeFunctions = {
        status: 'healthy',
        message: 'Health check function is responding',
      };
    }

    // System info
    results.system = {
      memory: Deno.memoryUsage(),
    };

    const statusCode = results.status === 'healthy' ? 200 : results.status === 'degraded' ? 503 : 500;

    return new Response(
      JSON.stringify(results, null, 2),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );

  } catch (error) {
    console.error('Error in health-check function:', error);
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
