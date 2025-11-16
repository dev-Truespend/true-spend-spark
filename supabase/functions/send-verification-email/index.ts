import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  console.log(`📧 [${requestId}] Verification email request`);

  try {
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

    // Check if already verified
    if (profile.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'Email already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Advanced rate limiting using database
    const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
    const MAX_ATTEMPTS_PER_HOUR = 3;

    // Generate hash for rate limiting (privacy-friendly)
    const emailToHash = user.email || '';
    const emailHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(emailToHash.toLowerCase().trim() + 'truespend_salt_2024')
    );
    const emailHashHex = Array.from(new Uint8Array(emailHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check rate limit
    const { data: rateLimit, error: rateLimitError } = await supabase
      .from('email_rate_limits')
      .select('*')
      .eq('email_hash', emailHashHex)
      .single();

    const now = new Date();
    
    if (rateLimit && !rateLimitError) {
      const windowStart = new Date(rateLimit.window_start);
      const timeSinceWindowStart = now.getTime() - windowStart.getTime();

      // If within current window
      if (timeSinceWindowStart < RATE_LIMIT_WINDOW) {
        if (rateLimit.attempt_count >= MAX_ATTEMPTS_PER_HOUR) {
          const minutesRemaining = Math.ceil((RATE_LIMIT_WINDOW - timeSinceWindowStart) / 60000);
          return new Response(
            JSON.stringify({ 
              error: `Rate limit exceeded. You can request another verification email in ${minutesRemaining} minutes.`,
              retryAfter: minutesRemaining
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Increment attempt count
        await supabase
          .from('email_rate_limits')
          .update({
            attempt_count: rateLimit.attempt_count + 1,
            last_attempt_at: now.toISOString()
          })
          .eq('email_hash', emailHashHex);
      } else {
        // Window expired, reset
        await supabase
          .from('email_rate_limits')
          .update({
            attempt_count: 1,
            window_start: now.toISOString(),
            last_attempt_at: now.toISOString()
          })
          .eq('email_hash', emailHashHex);
      }
    } else {
      // First attempt, create new record
      await supabase
        .from('email_rate_limits')
        .insert({
          email: user.email,
          email_hash: emailHashHex,
          attempt_count: 1,
          window_start: now.toISOString(),
          last_attempt_at: now.toISOString()
        });
    }

    // Additional check: Don't resend if verification expires in > 20 minutes
    const lastExpiry = profile.verification_expires_at;
    if (lastExpiry && new Date(lastExpiry) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(lastExpiry).getTime() - Date.now()) / 60000);
      if (minutesRemaining > 20) {
        return new Response(
          JSON.stringify({ 
            error: `Verification email already sent. Please check your inbox or wait ${minutesRemaining} minutes.`,
            expiresAt: lastExpiry
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update profile with token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_token: verificationToken,
        verification_expires_at: expiresAt.toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Send verification email
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://truespend.org';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi ${profile.first_name || 'there'},</p>
              <p>Welcome to <strong>TrueSpend</strong>! Click the button below to verify your email address and activate your account:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
              <div class="warning">
                <strong>⏰ Important:</strong> This verification link expires in <strong>24 hours</strong>. If you don't verify your email by then, your account will be automatically deleted and you'll need to sign up again.
              </div>
              <p>If you didn't create a TrueSpend account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TrueSpend. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') || 'TrueSpend <noreply@truespend.org>',
      to: [profile.email],
      subject: 'Verify your TrueSpend account',
      html: emailHtml,
    });

    if (emailError) {
      console.error(`❌ [${requestId}] Resend error:`, emailError);
      throw new Error('Failed to send verification email');
    }

    console.log(`✅ [${requestId}] Verification email sent to ${profile.email}`);

    // Log email delivery
    await supabase.from('email_delivery_logs').insert({
      user_id: user.id,
      email_type: 'verification',
      resend_message_id: emailData?.id,
      recipient_email: profile.email,
      status: 'sent',
      metadata: { request_id: requestId },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiresAt: expiresAt.toISOString(),
        message: 'Verification email sent successfully',
        request_id: requestId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
