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

    const normalizedEmail = email.toLowerCase().trim();

    // Query profiles table for auth provider and status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_provider, status, email_verified_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(
        JSON.stringify({ 
          provider: 'none',
          accountStatus: 'none',
          verified: false,
          requiresVerification: false,
          mfaEnabled: false
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
          requiresVerification: false,
          mfaEnabled: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has MFA enabled
    const { data: mfaSettings } = await supabase
      .from('mfa_settings')
      .select('totp_enabled')
      .eq('user_id', profile.id)
      .maybeSingle();

    const mfaEnabled = mfaSettings?.totp_enabled || false;

    // Check for multiple auth identities (email + google for same user)
    const { data: identities } = await supabase
      .from('auth_identities')
      .select('provider')
      .eq('user_id', profile.id);

    const hasGoogleAuth = identities?.some(i => i.provider === 'google') || false;
    const hasEmailAuth = identities?.some(i => i.provider === 'email') || false;

    // Determine primary provider
    let primaryProvider = profile.auth_provider || 'email';
    
    // If user has both Google and email, prefer Google
    if (hasGoogleAuth && hasEmailAuth) {
      primaryProvider = 'google';
    }

    return new Response(
      JSON.stringify({
        provider: primaryProvider,
        accountStatus: profile.status,
        verified: !!profile.email_verified_at,
        requiresVerification: profile.status === 'pending_verification',
        mfaEnabled,
        hasMultipleProviders: hasGoogleAuth && hasEmailAuth,
        availableProviders: identities?.map(i => i.provider) || []
      }),
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
        requiresVerification: false,
        mfaEnabled: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
