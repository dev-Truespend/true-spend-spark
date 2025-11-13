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
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find profile by email change token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email_change_token', token)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile || !profile.pending_new_email) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token expired
    const expiresAt = new Date(profile.email_change_expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This link has expired. Please request a new email change.' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldEmail = profile.email;
    const newEmail = profile.pending_new_email;

    // Move old email to history
    await supabase.from('previous_emails').insert({
      user_id: profile.id,
      email: oldEmail,
      replaced_at: new Date().toISOString()
    });

    // Update profile with new email
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email: newEmail,
        pending_new_email: null,
        email_change_token: null,
        email_change_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      throw updateError;
    }

    // Update auth.users email
    await supabase.auth.admin.updateUserById(profile.id, {
      email: newEmail
    });

    // Update auth_identities if email provider
    await supabase
      .from('auth_identities')
      .update({ provider_user_id: newEmail })
      .eq('user_id', profile.id)
      .eq('provider', 'email');

    // Log security event
    await supabase.from('security_logs').insert({
      user_id: profile.id,
      event_type: 'email_changed',
      severity: 'warning',
      details: { 
        old_email: oldEmail,
        new_email: newEmail
      }
    });

    console.log(`Email changed: ${oldEmail} -> ${newEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email changed successfully',
        newEmail: newEmail
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
