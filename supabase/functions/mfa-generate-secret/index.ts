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

    // Get user profile for email
    const { data: profile } = await supabaseClient
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

    // Store secret in database
    const { error: insertError } = await supabaseClient
      .from('mfa_settings')
      .upsert({
        user_id: user.id,
        totp_secret: secret,
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
