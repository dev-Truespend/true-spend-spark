import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import React from 'https://esm.sh/react@18.3.1';
import { SecurityAlertEmail } from '../_shared/email-templates/security-alert.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'invalid-email';
  return `${local.slice(0, 2)}***@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  console.log(`🚨 [${requestId}] Security alert request`);

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
      console.log(`Security alert requested for unavailable account`, { email: maskEmail(email) });
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
  const { data: emailData, error: emailError } = await resend.emails.send({
    from: Deno.env.get('RESEND_FROM_EMAIL') || 'TrueSpend <noreply@truespend.org>',
    to: [email],
    subject: alertType === 'password_changed' 
      ? 'Your password was changed'
      : alertType === 'account_locked'
      ? 'Your account has been locked'
      : 'Unusual sign-in activity detected',
    html: emailHtml,
  });

  if (emailError) {
    console.error(`❌ [${requestId}] Security alert email failed:`, {
      error: emailError,
      to: maskEmail(email)
    });
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send email', request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

    console.log(`✅ [${requestId}] Security alert sent`, { to: maskEmail(email) });

    // Log email delivery
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userProfile) {
      await supabase.from('email_delivery_logs').insert({
        user_id: userProfile.id,
        email_type: 'security_alert',
        resend_message_id: emailData?.id,
        recipient_email: email,
        status: 'sent',
        metadata: { request_id: requestId, alert_type: alertType },
      });
    }

    return new Response(
      JSON.stringify({ success: true, request_id: requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Send security alert error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
