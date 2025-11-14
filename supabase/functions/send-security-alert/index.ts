import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
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

    const { email, alertType, details } = await req.json();

    if (!email || !alertType) {
      return new Response(
        JSON.stringify({ error: 'Email and alert type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!profile) {
      console.log(`Security alert for non-existent email: ${email}`);
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Render email template
    const emailHtml = await renderAsync(
      React.createElement(SecurityAlertEmail, {
        firstName: profile.first_name || 'there',
        alertType,
        details: details || {}
      })
    );

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'TrueSpend Security <security@truespend.app>',
      to: [email],
      subject: alertType === 'password_changed' 
        ? 'Your password was changed'
        : alertType === 'account_locked'
        ? 'Your account has been locked'
        : 'Unusual sign-in activity detected',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send security alert:', emailError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send security alert error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
