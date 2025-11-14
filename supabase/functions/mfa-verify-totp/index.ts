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

    // Check rate limiting - max 5 attempts per 15 minutes
    const rateLimitWindow = new Date(Date.now() - 15 * 60 * 1000);
    const { data: rateLimitData } = await supabaseClient
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('identifier', userId)
      .eq('endpoint', 'mfa-verify')
      .gte('window_start', rateLimitWindow.toISOString())
      .single();

    if (rateLimitData && rateLimitData.request_count >= 5) {
      const timeRemaining = Math.ceil((new Date(rateLimitData.window_start).getTime() + 15 * 60 * 1000 - Date.now()) / 1000 / 60);
      
      await supabaseClient.from('security_logs').insert({
        user_id: userId,
        event_type: 'mfa_rate_limit_exceeded',
        severity: 'warn',
        details: { method: 'totp', attempts: rateLimitData.request_count },
      });

      console.log('MFA rate limit exceeded for user:', userId);
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Too many MFA verification attempts',
          retryAfter: timeRemaining 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this attempt
    if (rateLimitData) {
      await supabaseClient
        .from('rate_limits')
        .update({ request_count: rateLimitData.request_count + 1 })
        .eq('identifier', userId)
        .eq('endpoint', 'mfa-verify')
        .gte('window_start', rateLimitWindow.toISOString());
    } else {
      await supabaseClient
        .from('rate_limits')
        .insert({
          identifier: userId,
          endpoint: 'mfa-verify',
          window_start: new Date().toISOString(),
          window_size_seconds: 900,
          request_count: 1
        });
    }

    // Get user's encrypted TOTP secret
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

    // Decrypt the TOTP secret from Vault
    const { data: decryptedSecret, error: decryptError } = await supabaseClient
      .rpc('decrypt_totp_secret', { secret_id: mfaSettings.totp_secret });

    if (decryptError || !decryptedSecret) {
      console.error('Decryption error:', decryptError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to decrypt TOTP secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify TOTP code
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(decryptedSecret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const isValid = totp.validate({ token: code, window: 1 }) !== null;

    if (isValid) {
      // Clear rate limits on successful verification
      await supabaseClient
        .from('rate_limits')
        .delete()
        .eq('identifier', userId)
        .eq('endpoint', 'mfa-verify');

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
