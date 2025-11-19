/**
 * Rate limiting middleware for extension edge functions
 * Limits: 100 requests per user per 15 minutes
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface RateLimitConfig {
  requests: number;
  windowMinutes: number;
  identifier?: string; // Optional custom identifier
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requests: 100,
  windowMinutes: 15,
};

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const identifier = finalConfig.identifier || userId;
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (finalConfig.windowMinutes * 60 * 1000)) *
      (finalConfig.windowMinutes * 60 * 1000)
  );

  try {
    // Get or create rate limit record
    const { data: existingLimit, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart.toISOString())
      .eq('window_size_seconds', finalConfig.windowMinutes * 60)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[Rate Limit] Fetch error:', fetchError);
      // On error, allow request but log issue
      return {
        allowed: true,
        remaining: finalConfig.requests,
        resetAt: new Date(windowStart.getTime() + finalConfig.windowMinutes * 60 * 1000),
      };
    }

    let requestCount = 1;
    let allowed = true;

    if (existingLimit) {
      requestCount = existingLimit.request_count + 1;
      allowed = requestCount <= finalConfig.requests;

      // Update count
      await supabase
        .from('rate_limits')
        .update({ 
          request_count: requestCount,
          last_request_at: now.toISOString(),
        })
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
          window_size_seconds: finalConfig.windowMinutes * 60,
          last_request_at: now.toISOString(),
        });
    }

    const remaining = Math.max(0, finalConfig.requests - requestCount);
    const resetAt = new Date(windowStart.getTime() + finalConfig.windowMinutes * 60 * 1000);
    const retryAfter = allowed ? undefined : Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

    if (!allowed) {
      console.log(`[Rate Limit] Blocked: ${identifier} on ${endpoint} (${requestCount}/${finalConfig.requests})`);
    }

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter,
    };
  } catch (error) {
    console.error('[Rate Limit] Unexpected error:', error);
    // On error, allow request
    return {
      allowed: true,
      remaining: finalConfig.requests,
      resetAt: new Date(windowStart.getTime() + finalConfig.windowMinutes * 60 * 1000),
    };
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': String(DEFAULT_CONFIG.requests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
    ...(result.retryAfter && { 'Retry-After': String(result.retryAfter) }),
  };
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: HeadersInit) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}
