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

    const { email, ipAddress } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if account is locked
    const { data: lockStatus, error: lockError } = await supabase
      .rpc('is_account_locked', { p_identifier: email.toLowerCase() });

    if (lockError) {
      console.error('Lock check error:', lockError);
      return new Response(
        JSON.stringify({ error: 'Failed to check account status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (lockStatus && lockStatus.length > 0) {
      const lock = lockStatus[0];
      
      if (lock.is_locked) {
        const response = {
          locked: true,
          isEscalated: lock.is_escalated,
          lockExpiresAt: lock.lock_expires_at,
          message: lock.is_escalated
            ? 'For your security, this account is temporarily locked. Please reset your password to unlock your account.'
            : 'Too many sign-in attempts. Your account is locked for 15 minutes. Please try again later or reset your password.',
        };

        return new Response(
          JSON.stringify(response),
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
