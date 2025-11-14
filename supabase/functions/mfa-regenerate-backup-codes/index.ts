import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import * as OTPAuth from 'https://esm.sh/otpauth@9.3.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        JSON.stringify({ error: 'TOTP code required for verification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's MFA settings
    const { data: mfaSettings, error: mfaError } = await supabaseClient
      .from('mfa_settings')
      .select('totp_secret, totp_enabled')
      .eq('user_id', user.id)
      .single();

    if (mfaError || !mfaSettings || !mfaSettings.totp_enabled) {
      return new Response(
        JSON.stringify({ error: 'MFA not enabled' }),
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

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete old backup codes
    await supabaseClient
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', user.id);

    // Generate 10 new backup codes
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

    // Store new backup codes
    const { error: codesError } = await supabaseClient
      .from('mfa_backup_codes')
      .insert(
        hashedCodes.map((hashedCode) => ({
          user_id: user.id,
          code: hashedCode,
        }))
      );

    if (codesError) {
      console.error('Error storing new backup codes:', codesError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate new backup codes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log security event
    await supabaseClient.from('security_logs').insert({
      user_id: user.id,
      event_type: 'mfa_backup_codes_regenerated',
      severity: 'info',
      details: { count: 10 },
    });

    console.log('Backup codes regenerated for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        backupCodes,
        message: 'New backup codes generated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mfa-regenerate-backup-codes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
