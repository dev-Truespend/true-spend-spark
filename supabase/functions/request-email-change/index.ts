import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'invalid-email';
  return `${local.slice(0, 2)}***@${domain}`;
}

function appUrl(): string {
  const url = Deno.env.get('APP_URL') || Deno.env.get('FRONTEND_URL') || Deno.env.get('SITE_URL') || 'https://truespend.org';
  return url.replace(/\/+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newEmail } = await req.json();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: 'Valid email address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Check if new email is same as current
    if (newEmail.toLowerCase() === profile.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'New email must be different from current email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if new email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', newEmail)
      .eq('status', 'active')
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'This email is already in use by another account' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email change token
    const emailChangeToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update profile with pending email change
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        pending_new_email: newEmail,
        email_change_token: emailChangeToken,
        email_change_expires_at: expiresAt.toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    const verificationUrl = `${appUrl()}/confirm-email-change?token=${emailChangeToken}`;
    
    // Send confirmation email to NEW email
    const newEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🔄 Confirm Your New Email Address</h2>
            <p>Hi ${profile.first_name || 'there'},</p>
            <p>You requested to change your TrueSpend email from <strong>${profile.email}</strong> to <strong>${newEmail}</strong>.</p>
            <p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">Confirm Email Change</a></p>
            <p style="color: #666; font-size: 14px;">This link expires in 15 minutes.</p>
            <p>If you didn't request this change, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: 'TrueSpend <noreply@truespend.org>',
      to: [newEmail],
      subject: 'Confirm your new email address',
      html: newEmailHtml,
    });

    // Send notification email to OLD email
    const oldEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🔔 Email Change Request</h2>
            <p>Hi ${profile.first_name || 'there'},</p>
            <p>A request was made to change your TrueSpend email address to <strong>${newEmail}</strong>.</p>
            <p style="background: #fff3cd; padding: 12px; border-left: 4px solid #ffc107;">
              If you didn't make this request, please contact support immediately.
            </p>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: 'TrueSpend <noreply@truespend.org>',
      to: [profile.email],
      subject: 'Email change request for your account',
      html: oldEmailHtml,
    });

    console.log('Email change requested', {
      from: maskEmail(profile.email),
      to: maskEmail(newEmail),
      userId: user.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Confirmation email sent to new address',
        expiresAt: expiresAt.toISOString()
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
