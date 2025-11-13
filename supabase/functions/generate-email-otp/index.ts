import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Generating OTP for user: ${user.id}`);

    // Rate limiting: Check if user has requested OTP in last 1 minute
    const { data: recentCodes } = await supabase
      .from('mfa_email_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .gt('created_at', new Date(Date.now() - 60000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentCodes && recentCodes.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Please wait 1 minute before requesting a new code',
          remainingSeconds: Math.ceil((60000 - (Date.now() - new Date(recentCodes[0].created_at).getTime())) / 1000)
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store code in database
    const { error: insertError } = await supabase
      .from('mfa_email_codes')
      .insert({
        user_id: user.id,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing OTP code:', insertError);
      throw insertError;
    }

    // Send OTP via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Your TrueSpend Verification Code</h2>
                      <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 1.5;">Your verification code is:</p>
                      <div style="background-color: #f7fafc; border: 2px dashed #4F46E5; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                        <div style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #4F46E5; font-family: 'Courier New', monospace;">${code}</div>
                      </div>
                      <p style="margin: 0 0 16px 0; color: #e53e3e; font-size: 14px; font-weight: 500;">⏱️ This code will expire in 5 minutes.</p>
                      <p style="margin: 0 0 24px 0; color: #718096; font-size: 14px; line-height: 1.5;">For your security, this code is only valid for one use. If you didn't request this code, please ignore this email.</p>
                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
                      <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">TrueSpend Security Team</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: 'TrueSpend Security <security@truespend.org>',
      to: [user.email!],
      subject: 'Your TrueSpend Verification Code',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email via Resend:', emailError);
      throw new Error('Failed to send verification email');
    }

    console.log(`OTP code generated successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP code sent to your email',
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-email-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
