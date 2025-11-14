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

    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password confirmation required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    // Verify password
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: profile?.email || user.email || '',
      password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get encrypted secret ID before deleting
    const { data: mfaData } = await supabaseClient
      .from('mfa_settings')
      .select('totp_secret')
      .eq('user_id', user.id)
      .single();

    // Delete MFA settings
    const { error: deleteSettingsError } = await supabaseClient
      .from('mfa_settings')
      .delete()
      .eq('user_id', user.id);

    if (deleteSettingsError) {
      console.error('Error deleting MFA settings:', deleteSettingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to disable MFA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the encrypted secret from Vault
    if (mfaData?.totp_secret) {
      const { error: vaultDeleteError } = await supabaseClient
        .rpc('delete_totp_vault_secret', { secret_id: mfaData.totp_secret });

      if (vaultDeleteError) {
        console.error('Error deleting Vault secret:', vaultDeleteError);
        // Non-fatal, continue
      }
    }

    // Delete backup codes
    await supabaseClient
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', user.id);

    // Log security event
    await supabaseClient.from('security_logs').insert({
      user_id: user.id,
      event_type: 'mfa_disabled',
      severity: 'info',
      details: { method: 'totp' },
    });

    console.log('MFA disabled for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Two-factor authentication disabled successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mfa-disable:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
