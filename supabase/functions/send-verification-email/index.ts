import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Rate limiting: Check last verification email sent
    const lastExpiry = profile.verification_expires_at;
    if (lastExpiry && new Date(lastExpiry) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(lastExpiry).getTime() - Date.now()) / 60000);
      if (minutesRemaining > 20) { // Allow resend only if < 4 hours left
        return new Response(
          JSON.stringify({ 
            error: `Verification email already sent. Please wait or check your inbox.`,
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

    const { error: emailError } = await resend.emails.send({
      from: 'TrueSpend <noreply@truespend.org>',
      to: [profile.email],
      subject: 'Verify your TrueSpend account',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw new Error('Failed to send verification email');
    }

    console.log(`Verification email sent to ${profile.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiresAt: expiresAt.toISOString(),
        message: 'Verification email sent successfully'
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
