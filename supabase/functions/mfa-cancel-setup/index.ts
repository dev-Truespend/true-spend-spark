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
    const userClient = createClient(
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

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pending secret to delete from vault
    const { data: mfaSettings } = await adminClient
      .from('mfa_settings')
      .select('pending_mfa_secret')
      .eq('user_id', user.id)
      .maybeSingle();

    // Delete vault secret if exists
    if (mfaSettings?.pending_mfa_secret) {
      const { error: deleteError } = await adminClient
        .rpc('delete_totp_vault_secret', { 
          secret_id: mfaSettings.pending_mfa_secret 
        });
      
      if (deleteError) {
        console.warn('Failed to delete vault secret (non-fatal):', deleteError);
      }
    }

    // Clear pending secret
    await adminClient
      .from('mfa_settings')
      .update({ pending_mfa_secret: null })
      .eq('user_id', user.id);

    // Log cancellation
    await adminClient.from('security_logs').insert({
      user_id: user.id,
      event_type: 'mfa_setup_cancelled',
      severity: 'info',
      details: { timestamp: new Date().toISOString() },
    });

    console.log('MFA setup cancelled for user:', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error cancelling MFA setup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});