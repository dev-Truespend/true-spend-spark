import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email.trim())
      .eq('status', 'active')
      .maybeSingle();

    if (!profile) {
      // Don't reveal that user doesn't exist
      return new Response(
        JSON.stringify({ locked: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check MFA settings for login lock
    const { data: mfaSettings } = await supabase
      .from('mfa_settings')
      .select('login_lock_until')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (mfaSettings?.login_lock_until) {
      const lockUntil = new Date(mfaSettings.login_lock_until);
      const now = new Date();
      
      if (now < lockUntil) {
        return new Response(
          JSON.stringify({
            locked: true,
            lockExpiresAt: mfaSettings.login_lock_until,
            message: 'Too many failed attempts. Please try again later.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Not locked, allow login attempt
    return new Response(
      JSON.stringify({ locked: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Check login attempts error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
