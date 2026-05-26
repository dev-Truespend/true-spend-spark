import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

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

function appUrl(): string {
  const url = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'https://truespend.org';
  return url.replace(/\/+$/, '');
}

Deno.serve(async (req) => {
  // Generate or extract correlation ID
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, 'x-request-id': requestId } });
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

    // Rate limiting: 3 password reset requests per hour
    const { data: recentRequests } = await supabase
      .from('password_reset_tokens')
      .select('created_at')
      .eq('user_id', (await supabase.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle()).data?.id || 'none')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .order('created_at', { ascending: false });

    if (recentRequests && recentRequests.length >= 3) {
      // Too many requests, but still return success message
      console.log(`[${requestId}] Password reset rate limit hit`, { email: maskEmail(normalizedEmail) });
      return new Response(
        JSON.stringify(successResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
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
      console.log(`[${requestId}] Password reset requested for unavailable account`, { email: maskEmail(normalizedEmail) });
      return new Response(
        JSON.stringify(successResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
      );
    }

    // Block Google OAuth users from password reset
    if (profile.auth_provider === 'google') {
      console.log(`[${requestId}] Password reset blocked for Google OAuth user`, { email: maskEmail(normalizedEmail) });
      
      // Log security event
      await supabase.from('security_logs').insert({
        user_id: profile.id,
        event_type: 'google_oauth_password_reset_attempt',
        severity: 'warn',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        details: { email: maskEmail(normalizedEmail), blocked_reason: 'google_oauth_account' }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'google_oauth_account',
          message: 'This account uses Google sign-in. Please use the "Sign in with Google" button to access your account. Password reset is not available for Google accounts.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
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
    const resetLink = `${appUrl()}/reset-password?token=${token}`;

    // Create simple HTML email (avoiding React SSR issues)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${profile.first_name || 'there'},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your TrueSpend password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 14px; color: #667eea; word-break: break-all; margin-bottom: 20px;">${resetLink}</p>
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;"><strong>This link will expire in 30 minutes.</strong></p>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">If you didn't request a password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">TrueSpend Security Team</p>
          </div>
        </body>
      </html>
    `;

    // Send email. Do not log reset links, API keys, or full email addresses.
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'TrueSpend <noreply@truespend.org>';
    console.log(`[${requestId}] Sending password reset email`, {
      to: maskEmail(profile.email),
      fromConfigured: Boolean(Deno.env.get('RESEND_FROM_EMAIL')),
      resendConfigured: Boolean(Deno.env.get('RESEND_API_KEY')),
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [profile.email],
      subject: 'Reset your TrueSpend password',
      html: emailHtml,
    });

    if (emailError) {
      console.error(`[${requestId}] Password reset email failed`, {
        errorName: emailError.name,
        errorMessage: emailError.message,
        to: maskEmail(profile.email),
        fromConfigured: Boolean(fromEmail),
      });
      // Still return success message (fail securely)
    } else {
      console.log(`[${requestId}] Password reset email accepted`, {
        emailId: emailData?.id,
        to: maskEmail(profile.email),
      });
    }

    // Log security event
    await supabase.from('security_logs').insert({
      user_id: profile.id,
      event_type: 'password_reset_requested',
      severity: 'info',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: { email: maskEmail(normalizedEmail) }
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
