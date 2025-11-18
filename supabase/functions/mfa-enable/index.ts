import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import * as OTPAuth from 'https://esm.sh/otpauth@9.3.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
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
  // Generate or extract correlation ID
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, 'x-request-id': requestId } });
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

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
      );
    }

    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return new Response(
        JSON.stringify({ 
          error: 'Please enter a valid 6-digit code',
          code: 'INVALID_CODE_FORMAT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
      );
    }

    // Get MFA settings with pending secret and lock status
    const { data: mfaSettings, error: mfaError } = await supabaseClient
      .from('mfa_settings')
      .select('pending_mfa_secret, failed_mfa_attempts, mfa_lock_until, totp_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (mfaError) {
      console.error(`[${requestId}] MFA settings fetch error:`, mfaError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch MFA settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
      );
    }

    // CHECK 1: Is user locked?
    const now = new Date();
    if (mfaSettings?.mfa_lock_until) {
      const lockUntil = new Date(mfaSettings.mfa_lock_until);
      if (lockUntil > now) {
        console.log(`[${requestId}] MFA verification locked for user:`, user.id);
        
        await adminClient.from('security_logs').insert({
          user_id: user.id,
          event_type: 'mfa_verify_locked',
          severity: 'warn',
          details: { 
            failed_attempts: mfaSettings.failed_mfa_attempts,
            lock_until: mfaSettings.mfa_lock_until,
            timestamp: now.toISOString(),
          },
        });

        return new Response(
          JSON.stringify({ 
            error: 'Too many incorrect codes. Please try again in 24 hours.',
            code: 'MFA_VERIFY_LOCKED'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
        );
      }
    }

    // CHECK 2: Is there a pending secret?
    if (!mfaSettings?.pending_mfa_secret) {
      return new Response(
        JSON.stringify({ 
          error: 'No MFA setup in progress. Please start MFA setup first.',
          code: 'NO_PENDING_SETUP'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
      );
    }

    // Decrypt PENDING secret (not totp_secret)
    const { data: decryptedSecret, error: decryptError } = await adminClient
      .rpc('decrypt_totp_secret', { secret_id: mfaSettings.pending_mfa_secret });

    if (decryptError || !decryptedSecret) {
      console.error('Decryption error:', decryptError);
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt TOTP secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify TOTP code
    const totp = new OTPAuth.TOTP({
      issuer: 'TrueSpend',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(decryptedSecret),
    });

    const isValid = totp.validate({ token: code, window: 1 }) !== null;

    // INVALID CODE - Increment failures
    if (!isValid) {
      const newFailedAttempts = (mfaSettings.failed_mfa_attempts || 0) + 1;
      const shouldLock = newFailedAttempts >= MAX_MFA_FAILS;
      
      await adminClient
        .from('mfa_settings')
        .update({
          failed_mfa_attempts: newFailedAttempts,
          mfa_lock_until: shouldLock 
            ? new Date(Date.now() + MFA_LOCK_HOURS * 60 * 60 * 1000).toISOString()
            : null,
        })
        .eq('user_id', user.id);
      
      await adminClient.from('security_logs').insert({
        user_id: user.id,
        event_type: shouldLock ? 'mfa_verify_locked' : 'mfa_verify_failed',
        severity: 'warn',
        details: { 
          method: 'totp',
          failed_attempts: newFailedAttempts,
          locked: shouldLock,
          timestamp: now.toISOString(),
        },
      });
      
      if (shouldLock) {
        return new Response(
          JSON.stringify({ 
            error: 'Too many incorrect codes. Please try again in 24 hours.',
            code: 'MFA_VERIFY_LOCKED'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'The verification code is incorrect or expired.',
          code: 'MFA_VERIFY_INVALID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VALID CODE - Enable MFA and generate backup codes
    console.log('Valid TOTP code, enabling MFA for user:', user.id);

    // Generate backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(generateBackupCode());
    }

    // Hash backup codes for storage
    const hashedCodes = await Promise.all(
      backupCodes.map(async (code) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      })
    );

    // Store hashed backup codes
    const backupCodeRecords = hashedCodes.map(hash => ({
      user_id: user.id,
      code: hash,
    }));

    await adminClient
      .from('mfa_backup_codes')
      .insert(backupCodeRecords);

    // CRITICAL: Move pending_mfa_secret to totp_secret and enable MFA
    // This is the ONLY place where totp_enabled is set to true
    console.log('[MFA-ENABLE] Setting totp_enabled=true for user:', user.id);
    
    await adminClient
      .from('mfa_settings')
      .update({
        totp_secret: mfaSettings.pending_mfa_secret, // Move pending to active
        pending_mfa_secret: null, // Clear pending
        totp_enabled: true, // ENABLE MFA - only after valid code verification
        backup_codes_generated: true,
        failed_mfa_attempts: 0, // Reset counter
        mfa_lock_until: null, // Clear any lock
        enabled_at: now.toISOString(),
        last_verified_at: now.toISOString(),
      })
      .eq('user_id', user.id);

    // Log success with explicit totp_enabled flag
    await adminClient.from('security_logs').insert({
      user_id: user.id,
      event_type: 'mfa_enabled',
      severity: 'info',
      details: { 
        method: 'totp',
        totp_enabled: true,
        verification_successful: true,
        timestamp: now.toISOString(),
      },
    });

    console.log('[MFA-ENABLE] SUCCESS - totp_enabled=true written to DB for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        backupCodes, // Return unhashed codes to user (only time they see them)
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