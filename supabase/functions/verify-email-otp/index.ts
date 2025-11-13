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

    // Get user from request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Extract IP address for logging
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
                   || req.headers.get('cf-connecting-ip') 
                   || 'unknown';

    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying OTP for user: ${user.id}`);

    // Find the most recent unverified code for this user
    const { data: otpRecord, error: fetchError } = await supabase
      .from('mfa_email_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError);
      throw fetchError;
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: 'No valid code found. Please request a new code.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check maximum attempts (5 attempts max)
    if (otpRecord.attempts >= 5) {
      // Log account locked event
      await supabase.from('security_logs').insert({
        user_id: user.id,
        event_type: 'account_locked',
        severity: 'critical',
        ip_address: ipAddress,
        details: { reason: 'max_otp_attempts_exceeded', attempts: otpRecord.attempts }
      });

      return new Response(
        JSON.stringify({ 
          error: 'Maximum verification attempts exceeded. Please request a new code.',
          maxAttemptsReached: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempt count
    const newAttemptCount = otpRecord.attempts + 1;
    await supabase
      .from('mfa_email_codes')
      .update({ attempts: newAttemptCount })
      .eq('id', otpRecord.id);

    // Verify the code
    if (otpRecord.code !== code) {
      console.log(`Invalid OTP code for user ${user.id}, attempts: ${newAttemptCount}`);

      // Log failed attempt
      await supabase.from('auth_attempts').insert({
        ip_address: ipAddress,
        user_id: user.id,
        attempt_type: 'otp_verify',
        success: false,
        metadata: { attempts: newAttemptCount }
      });

      // Send security alert after 3 failed attempts
      if (newAttemptCount >= 3 && newAttemptCount < 5) {
        try {
          const securityEmailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 0;">
                  <tr>
                    <td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <tr>
                          <td style="padding: 40px;">
                            <h2 style="margin: 0 0 24px 0; color: #e53e3e; font-size: 24px; font-weight: 600;">⚠️ Security Alert</h2>
                            <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 16px; line-height: 1.5;">We detected ${newAttemptCount} failed login attempts on your TrueSpend account.</p>
                            <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 16px; margin: 0 0 24px 0;">
                              <p style="margin: 0 0 8px 0; color: #742a2a; font-weight: 600;">Failed Attempts: ${newAttemptCount} of 5</p>
                              <p style="margin: 0; color: #742a2a; font-size: 14px;">IP Address: ${ipAddress}</p>
                            </div>
                            <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 14px; line-height: 1.5;">If this wasn't you, please secure your account immediately by requesting a new verification code.</p>
                            <p style="margin: 0 0 24px 0; color: #718096; font-size: 14px; line-height: 1.5;">After 5 failed attempts, you'll need to request a new verification code.</p>
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

          await resend.emails.send({
            from: 'TrueSpend Security <noreply@truespend.org>',
            to: [user.email!],
            subject: '⚠️ Security Alert: Failed Login Attempts',
            html: securityEmailHtml,
          });

          // Log security notification sent
          await supabase.from('security_logs').insert({
            user_id: user.id,
            event_type: 'suspicious_activity',
            severity: 'warning',
            ip_address: ipAddress,
            details: { 
              reason: 'multiple_failed_otp_attempts', 
              attempts: newAttemptCount,
              notification_sent: true
            }
          });
        } catch (emailError) {
          console.error('Failed to send security alert email:', emailError);
        }
      }

      return new Response(
        JSON.stringify({ 
          error: 'Invalid verification code',
          attemptsRemaining: 5 - newAttemptCount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful verification
    await supabase.from('auth_attempts').insert({
      ip_address: ipAddress,
      user_id: user.id,
      attempt_type: 'otp_verify',
      success: true,
      metadata: { email: user.email }
    });

    // Mark as verified
    const { error: verifyError } = await supabase
      .from('mfa_email_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (verifyError) {
      console.error('Error marking code as verified:', verifyError);
      throw verifyError;
    }

    // Cleanup old codes for this user
    await supabase
      .from('mfa_email_codes')
      .delete()
      .eq('user_id', user.id)
      .neq('id', otpRecord.id);

    console.log(`OTP verified successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Code verified successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in verify-email-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
