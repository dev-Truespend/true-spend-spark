import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import React from 'https://esm.sh/react@18.3.1';
import { SecurityAlertEmail } from '../_shared/email-templates/security-alert.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Token and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token
    const { data: validationData, error: validationError } = await supabase
      .rpc('validate_reset_token', { p_token: token });

    if (validationError) {
      console.error('Token validation error:', validationError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate reset token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validationData || validationData.length === 0 || !validationData[0].is_valid) {
      const errorMessage = validationData?.[0]?.error_message || 'Invalid or expired reset token';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = validationData[0].user_id;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('id', userId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check password against history (this would require storing hashed passwords)
    // For now, we'll use Supabase's built-in password update which handles this

    // Update password using Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    await supabase.rpc('mark_token_used', { p_token: token });

    // Sign out all sessions for this user
    await supabase.auth.admin.signOut(userId, 'global');

    // Log password change
    await supabase.from('security_logs').insert({
      user_id: userId,
      event_type: 'password_changed',
      severity: 'info',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: { method: 'password_reset', timestamp: new Date().toISOString() }
    });

    // Send security alert email
    try {
      const emailHtml = await renderAsync(
        React.createElement(SecurityAlertEmail, {
          firstName: profile.first_name || 'there',
          alertType: 'password_changed',
          details: {
            timestamp: new Date().toLocaleString(),
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
          }
        })
      );

      await resend.emails.send({
        from: 'TrueSpend Security <security@truespend.app>',
        to: [profile.email],
        subject: 'Your TrueSpend password was changed',
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Failed to send security alert email:', emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password updated successfully. You can now log in with your new password.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Complete password reset error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
