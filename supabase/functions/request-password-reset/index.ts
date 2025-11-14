import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import React from 'https://esm.sh/react@18.3.1';
import { PasswordResetEmail } from '../_shared/email-templates/password-reset.tsx';

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

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ALWAYS return the same generic success message (never reveal if email exists)
    const successResponse = {
      success: true,
      message: `If an account exists for ${email}, we've sent a password reset link. Please check your inbox and spam folder.`
    };

    // Rate limiting: check if too many reset requests from this email
    const { data: recentRequests } = await supabase
      .from('password_reset_tokens')
      .select('created_at')
      .eq('user_id', (await supabase.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle()).data?.id || 'none')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .order('created_at', { ascending: false });

    if (recentRequests && recentRequests.length >= 3) {
      // Too many requests, but still return success message
      console.log(`Rate limit hit for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify(successResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, first_name, status, auth_provider')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // If user doesn't exist or is deleted, still return success (don't reveal)
    if (!profile || profile.status === 'deleted') {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify(successResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block Google OAuth users from password reset
    if (profile.auth_provider === 'google') {
      console.log(`Password reset blocked for Google OAuth user: ${normalizedEmail}`);
      
      // Log security event
      await supabase.from('security_logs').insert({
        user_id: profile.id,
        event_type: 'google_oauth_password_reset_attempt',
        severity: 'warn',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        details: { email: normalizedEmail, blocked_reason: 'google_oauth_account' }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'google_oauth_account',
          message: 'This account uses Google sign-in. Please use the "Sign in with Google" button to access your account. Password reset is not available for Google accounts.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token in database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

    if (tokenError) {
      console.error('Failed to create reset token:', tokenError);
      // Still return success message (fail securely)
      return new Response(
        JSON.stringify(successResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create reset link
    const resetLink = `${Deno.env.get('SITE_URL') || 'https://truespend.org'}/reset-password?token=${token}`;

    // Render email template
    const emailHtml = await renderAsync(
      React.createElement(PasswordResetEmail, {
        firstName: profile.first_name || 'there',
        resetLink,
      })
    );

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'TrueSpend <noreply@truespend.app>',
      to: [profile.email],
      subject: 'Reset your TrueSpend password',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    // Log security event
    await supabase.from('security_logs').insert({
      user_id: profile.id,
      event_type: 'password_reset_requested',
      severity: 'info',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: { email: normalizedEmail }
    });

    return new Response(
      JSON.stringify(successResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Request password reset error:', error);
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'If an account exists for this email, we\'ve sent a password reset link.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
