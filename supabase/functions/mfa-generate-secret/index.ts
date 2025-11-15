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
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Admin client for secure RPC and writes (vault, upserts)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Generate TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: 'TrueSpend',
      label: profile?.email || user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;

    // Generate OTPAuth URL for QR code
    const otpauthUrl = totp.toString();

    const { data: existing } = await userClient
      .from('mfa_settings' as any)
      .select('totp_secret')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.totp_secret) {
      // Best-effort cleanup to avoid duplicate Vault secret name errors
      const { error: vaultDeleteErr } = await adminClient
        .rpc('delete_totp_vault_secret', { secret_id: existing.totp_secret });
      if (vaultDeleteErr) {
        console.warn('Vault delete before re-encrypt failed (non-fatal):', vaultDeleteErr);
      }
    }

    const { data: encryptedSecretId, error: encryptError } = await adminClient
      .rpc('encrypt_totp_secret', { secret });


    if (encryptError || !encryptedSecretId) {
      console.error('Encryption error:', encryptError);
      return new Response(
        JSON.stringify({ error: 'Failed to encrypt TOTP secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store encrypted secret ID in database
    const { error: insertError } = await adminClient
      .from('mfa_settings')
      .upsert({
        user_id: user.id,
        totp_secret: encryptedSecretId,
        totp_enabled: false,
        backup_codes_generated: false,
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('Error storing MFA secret:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store MFA secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('MFA secret generated for user:', user.id);

    return new Response(
      JSON.stringify({
        secret,
        qrCodeUrl: otpauthUrl,
        issuer: 'TrueSpend',
        label: profile?.email || user.email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mfa-generate-secret:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
