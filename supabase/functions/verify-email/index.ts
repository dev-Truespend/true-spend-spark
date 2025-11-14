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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Verification token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find profile by verification token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('verification_token', token)
      .eq('status', 'pending_verification')
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ 
          error: 'invalid_or_expired',
          message: 'This verification link is invalid or has already been used.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token expired
    const expiresAt = new Date(profile.verification_expires_at);
    if (expiresAt < new Date()) {
      // Check if account was auto-deleted
      if (profile.status === 'deleted') {
        return new Response(
          JSON.stringify({ 
            error: 'account_deleted',
            message: 'This verification link has expired and the account has been removed. Please sign up again.'
          }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'expired',
          message: 'This verification link has expired. Please request a new verification email.'
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the email
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        email_verified_at: new Date().toISOString(),
        verification_token: null,
        verification_expires_at: null
      })
      .eq('id', profile.id);

    if (updateError) {
      throw updateError;
    }

    // Log security event (without PII)
    await supabase.from('security_logs').insert({
      user_id: profile.id,
      event_type: 'email_verified',
      severity: 'info',
      details: { timestamp: new Date().toISOString() }
    });

    console.log(`Email verified for user ${profile.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verified successfully!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
