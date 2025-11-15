import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_LOGIN_FAILS = 5;
const LOGIN_LOCK_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current MFA settings
    const { data: mfaSettings } = await supabase
      .from('mfa_settings')
      .select('failed_login_attempts')
      .eq('user_id', userId)
      .maybeSingle();

    const newFailedAttempts = (mfaSettings?.failed_login_attempts || 0) + 1;
    const updateData: any = {
      failed_login_attempts: newFailedAttempts,
    };

    // If reached max failures, lock the account
    if (newFailedAttempts >= MAX_LOGIN_FAILS) {
      const lockUntil = new Date();
      lockUntil.setHours(lockUntil.getHours() + LOGIN_LOCK_HOURS);
      updateData.login_lock_until = lockUntil.toISOString();

      console.log('Login locked for user:', userId, 'until:', lockUntil);

      await supabase
        .from('mfa_settings')
        .update(updateData)
        .eq('user_id', userId);

      await supabase.from('security_logs').insert({
        user_id: userId,
        event_type: 'login_locked',
        severity: 'error',
        details: {
          failed_attempts: newFailedAttempts,
          locked_until: lockUntil.toISOString(),
          timestamp: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ 
          locked: true,
          lockExpiresAt: lockUntil.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Not locked yet, just increment counter
    await supabase
      .from('mfa_settings')
      .update(updateData)
      .eq('user_id', userId);

    await supabase.from('security_logs').insert({
      user_id: userId,
      event_type: 'login_failed',
      severity: 'warn',
      details: {
        failed_attempts: newFailedAttempts,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        locked: false,
        failedAttempts: newFailedAttempts,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Increment login failures error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
