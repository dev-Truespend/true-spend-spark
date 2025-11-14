import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for rate limiting (resets on function cold start)
const rateLimitCache = new Map<string, { count: number; resetAt: number; attempts: number }>();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Rate limiting: 10 requests per minute per IP with exponential backoff
    const now = Date.now();
    const limitKey = `${ipAddress}`;
    const limitData = rateLimitCache.get(limitKey);

    if (limitData) {
      if (now < limitData.resetAt) {
        if (limitData.count >= 10) {
          // Calculate backoff time based on consecutive attempts
          const backoffSeconds = Math.min(60, Math.pow(2, limitData.attempts));
          
          // Log suspicious activity
          await supabase.from('security_logs').insert({
            event_type: 'rate_limit_exceeded',
            severity: 'warning',
            ip_address: ipAddress,
            details: {
              endpoint: 'check-auth-provider',
              email,
              attempts: limitData.attempts,
              backoff_seconds: backoffSeconds
            }
          });

          return new Response(
            JSON.stringify({ 
              error: 'Too many requests',
              retry_after: backoffSeconds 
            }),
            { 
              status: 429, 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Retry-After': backoffSeconds.toString()
              } 
            }
          );
        }
        limitData.count++;
      } else {
        // Reset window
        limitData.count = 1;
        limitData.resetAt = now + 60000; // 1 minute
        limitData.attempts = 0;
      }
    } else {
      rateLimitCache.set(limitKey, { count: 1, resetAt: now + 60000, attempts: 0 });
    }

    // Query profiles table for auth provider and status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('auth_provider, status, email_verified_at')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(
        JSON.stringify({ 
          provider: 'none',
          accountStatus: 'none',
          verified: false,
          requiresVerification: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No profile found
    if (!profile) {
      return new Response(
        JSON.stringify({ 
          provider: 'none',
          accountStatus: 'none',
          verified: false,
          requiresVerification: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Profile found - return details
    const response = {
      provider: profile.auth_provider || 'email',
      accountStatus: profile.status || 'active',
      verified: !!profile.email_verified_at,
      requiresVerification: profile.status === 'pending_verification'
    };

    // Log the check (for analytics, not security)
    await supabase.from('security_logs').insert({
      event_type: 'auth_provider_checked',
      severity: 'info',
      ip_address: ipAddress,
      details: {
        email,
        provider: response.provider,
        status: response.accountStatus
      }
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Check auth provider error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        provider: 'none',
        accountStatus: 'none',
        verified: false,
        requiresVerification: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
