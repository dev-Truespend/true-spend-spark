import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile to check auth provider
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('auth_provider')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile');
    }

    // Google OAuth users don't have passwords
    if (profile.auth_provider === 'google') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Google OAuth users cannot change passwords' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password by attempting sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    // Log verification attempt
    await supabase.from('security_logs').insert({
      user_id: user.id,
      event_type: 'password_verification',
      severity: signInError ? 'warning' : 'info',
      details: {
        success: !signInError,
        timestamp: new Date().toISOString(),
      },
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Current password is incorrect' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Password is valid - immediately sign out the verification session
    if (signInData.session) {
      await supabase.auth.admin.signOut(signInData.session.access_token);
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Password verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
