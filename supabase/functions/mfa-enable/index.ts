import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import * as OTPAuth from 'https://esm.sh/otpauth@9.3.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MFA_FAILS = 5;
const MFA_LOCK_HOURS = 24;

// Generate secure random backup code
function generateBackupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: 'INVALID_VERIFICATION_CODE',
            message: 'Invalid verification code format',
            userMessage: 'Please enter a valid 6-digit code'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's encrypted TOTP secret and rate limit data
    const { data: mfaSettings, error: mfaError } = await supabaseClient
      .from('mfa_settings')
      .select('totp_secret, failed_mfa_attempts, mfa_lock_until')
      .eq('user_id', user.id)
      .single();

    if (mfaError || !mfaSettings) {
      await supabaseClient.from('security_logs').insert({
        user_id: user.id,
        event_type: 'mfa_verify_failed',
        severity: 'warn',
        details: { method: 'totp', reason: 'not_setup' },
      });
      
      return new Response(
        JSON.stringify({ 
          error: {
            code: 'MFA_NOT_SETUP',
            message: 'MFA not set up',
            userMessage: 'Please generate a secret first before enabling MFA'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is locked due to too many failed attempts
    const now = new Date();
    if (mfaSettings.mfa_lock_until) {
      const lockUntil = new Date(mfaSettings.mfa_lock_until);
      if (now < lockUntil) {
        console.log('MFA verification locked for user:', user.id);
        
        await supabaseClient.from('security_logs').insert({
          user_id: user.id,
          event_type: 'mfa_verify_locked',
          severity: 'warning',
          details: {
            locked_until: mfaSettings.mfa_lock_until,
            timestamp: now.toISOString(),
          },
        });

        return new Response(
          JSON.stringify({ 
            code: 'MFA_VERIFY_LOCKED',
            error: 'Too many incorrect codes. Please try again in 24 hours.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Decrypt the TOTP secret from Vault
    const { data: decryptedSecret, error: decryptError } = await supabaseClient
      .rpc('decrypt_totp_secret', { secret_id: mfaSettings.totp_secret });

    if (decryptError || !decryptedSecret) {
      console.error('Decryption error:', decryptError);
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt TOTP secret' }),
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

    if (!isValid) {
      console.log('Invalid TOTP code for user:', user.id);
      
      // Increment failed attempts
      const newFailedAttempts = (mfaSettings.failed_mfa_attempts || 0) + 1;
      const updateData: any = {
        failed_mfa_attempts: newFailedAttempts,
      };

      // If reached max failures, lock the account
      if (newFailedAttempts >= MAX_MFA_FAILS) {
        const lockUntil = new Date();
        lockUntil.setHours(lockUntil.getHours() + MFA_LOCK_HOURS);
        updateData.mfa_lock_until = lockUntil.toISOString();

        console.log('MFA verification locked for user:', user.id, 'until:', lockUntil);

        await supabaseClient
          .from('mfa_settings')
          .update(updateData)
          .eq('user_id', user.id);

        await supabaseClient.from('security_logs').insert({
          user_id: user.id,
          event_type: 'mfa_verify_locked',
          severity: 'error',
          details: {
            failed_attempts: newFailedAttempts,
            locked_until: lockUntil.toISOString(),
            timestamp: new Date().toISOString(),
          },
        });

        return new Response(
          JSON.stringify({ 
            code: 'MFA_VERIFY_LOCKED',
            error: 'Too many incorrect codes. Please try again in 24 hours.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Not locked yet, just increment counter
      await supabaseClient
        .from('mfa_settings')
        .update(updateData)
        .eq('user_id', user.id);
      
      // Log failed verification attempt
      await supabaseClient.from('security_logs').insert({
        user_id: user.id,
        event_type: 'mfa_verify_failed',
        severity: 'warn',
        details: {
          method: 'totp',
          reason: 'invalid_code',
          failed_attempts: newFailedAttempts,
          timestamp: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ 
          code: 'MFA_VERIFY_INVALID',
          error: 'The verification code is incorrect or expired.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () => generateBackupCode());

    // Hash backup codes before storing
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      })
    );

    // Enable MFA and reset rate limit counters
    const { error: updateError } = await supabaseClient
      .from('mfa_settings')
      .update({
        totp_enabled: true,
        backup_codes_generated: true,
        enabled_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        failed_mfa_attempts: 0,
        mfa_lock_until: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error enabling MFA:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to enable MFA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store backup codes
    const { error: codesError } = await supabaseClient
      .from('mfa_backup_codes')
      .insert(
        hashedCodes.map((hashedCode) => ({
          user_id: user.id,
          code: hashedCode,
        }))
      );

    if (codesError) {
      console.error('Error storing backup codes:', codesError);
      return new Response(
        JSON.stringify({ error: 'Failed to store backup codes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log MFA enabled event
    await supabaseClient.from('security_logs').insert({
      user_id: user.id,
      event_type: 'mfa_enabled',
      severity: 'info',
      details: { method: 'totp', backup_codes_count: 10 },
    });

    console.log('MFA enabled successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        backupCodes,
        message: 'Two-factor authentication enabled successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mfa-enable:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
