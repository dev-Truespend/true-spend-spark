import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import * as OTPAuth from 'https://esm.sh/otpauth@9.3.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userId, code } = await req.json();

    if (!userId || !code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's MFA settings
    const { data: mfaSettings, error: mfaError } = await supabaseClient
      .from('mfa_settings')
      .select('totp_secret, totp_enabled')
      .eq('user_id', userId)
      .single();

    if (mfaError || !mfaSettings || !mfaSettings.totp_enabled) {
      return new Response(
        JSON.stringify({ valid: false, error: 'MFA not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify TOTP code
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(mfaSettings.totp_secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const isValid = totp.validate({ token: code, window: 1 }) !== null;

    if (isValid) {
      // Update last verified timestamp
      await supabaseClient
        .from('mfa_settings')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('user_id', userId);

      // Log successful verification
      await supabaseClient.from('security_logs').insert({
        user_id: userId,
        event_type: 'mfa_verified',
        severity: 'info',
        details: { method: 'totp', success: true },
      });

      console.log('MFA verification successful for user:', userId);
    } else {
      // Log failed attempt
      await supabaseClient.from('security_logs').insert({
        user_id: userId,
        event_type: 'mfa_verification_failed',
        severity: 'warn',
        details: { method: 'totp', success: false },
      });

      console.log('MFA verification failed for user:', userId);
    }

    return new Response(
      JSON.stringify({ valid: isValid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mfa-verify-totp:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
