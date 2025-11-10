import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configuration
const RATE_LIMITS = {
  authenticated: {
    requests: 100,
    window: 60, // seconds
    burst: 120,
    burstWindow: 10, // seconds
  },
  anonymous: {
    requests: 200,
    window: 60,
    burst: 250,
    burstWindow: 10,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get identifier (user ID or IP address)
    const authHeader = req.headers.get('authorization');
    let identifier: string;
    let isAuthenticated = false;
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        identifier = user.id;
        userId = user.id;
        isAuthenticated = true;
      } else {
        // Fall back to IP if token invalid
        identifier = req.headers.get('x-forwarded-for') || 'unknown';
      }
    } else {
      identifier = req.headers.get('x-forwarded-for') || 'unknown';
    }

    const { endpoint = '/api' } = await req.json();
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / 1000) * 1000);

    // Get rate limit config
    const config = isAuthenticated ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous;

    // Check current rate limit
    const { data: existingLimit, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart.toISOString())
      .eq('window_size_seconds', config.window)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let requestCount = 1;
    let shouldBlock = false;

    if (existingLimit) {
      requestCount = existingLimit.request_count + 1;
      shouldBlock = requestCount > config.requests;

      // Update count
      await supabase
        .from('rate_limits')
        .update({ request_count: requestCount })
        .eq('id', existingLimit.id);
    } else {
      // Create new record
      await supabase
        .from('rate_limits')
        .insert({
          identifier,
          endpoint,
          request_count: requestCount,
          window_start: windowStart.toISOString(),
          window_size_seconds: config.window,
        });
    }

    // Calculate rate limit headers
    const remaining = Math.max(0, config.requests - requestCount);
    const resetTime = new Date(windowStart.getTime() + config.window * 1000);
    const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);

    const rateLimitHeaders = {
      'X-RateLimit-Limit': config.requests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toISOString(),
    };

    if (shouldBlock) {
      console.log(`Rate limit exceeded for ${identifier} on ${endpoint}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter,
          limit: config.requests,
          window: config.window,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders,
            'Retry-After': retryAfter.toString(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Success - rate limit check passed
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining,
        limit: config.requests,
        reset: resetTime.toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in rate-limiter function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
