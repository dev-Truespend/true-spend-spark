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
    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ exists: false, hasLocal: false, mfaEnabled: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Find user by email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, status')
      .ilike('email', email.trim())
      .eq('status', 'active')
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ exists: false, hasLocal: false, mfaEnabled: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has local (email/password) auth
    const { data: identities } = await supabaseClient
      .from('auth_identities')
      .select('provider')
      .eq('user_id', profile.id);

    const hasLocal = identities?.some(i => i.provider === 'email') || false;

    // Check MFA status (only relevant for local auth)
    const { data: mfaSettings } = await supabaseClient
      .from('mfa_settings')
      .select('totp_enabled')
      .eq('user_id', profile.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        exists: true,
        hasLocal,
        mfaEnabled: hasLocal && mfaSettings?.totp_enabled === true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking MFA status:', error);
    return new Response(
      JSON.stringify({ exists: false, hasLocal: false, mfaEnabled: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
