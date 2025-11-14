import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, number[]>();

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 5;

  const timestamps = rateLimitMap.get(ip) || [];
  const recentRequests = timestamps.filter(t => now - t < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return true;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return false;
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    
    console.log(`[Resend Test] Request from IP: ${clientIp}`);

    // Rate limiting
    if (isRateLimited(clientIp)) {
      console.log(`[Resend Test] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Max 5 requests per 10 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fixed recipient for security
    const ALLOWED_EMAIL = "raj.yagateela@gmail.com";

    // Generate test code
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const sentAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    console.log(`[Resend Test] Sending test email to ${ALLOWED_EMAIL}, code: ${testCode}`);

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "TrueSpend <noreply@truespend.org>",
      to: [ALLOWED_EMAIL],
      subject: "TrueSpend: Test OTP (Resend Path Verification)",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TrueSpend Test OTP</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center;">
                <h1 style="margin: 0 0 24px 0; color: #1a202c; font-size: 28px; font-weight: 700;">TrueSpend Test Email</h1>
                <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.5;">This is a test to verify Resend email delivery from <strong>truespend.org</strong>.</p>
                
                <div style="background-color: #f7fafc; border: 2px dashed #4F46E5; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                  <div style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #4F46E5; font-family: 'Courier New', monospace;">${testCode}</div>
                </div>
                
                <p style="margin: 0 0 16px 0; color: #718096; font-size: 14px;">Sent at: ${sentAt}</p>
                <p style="margin: 0 0 16px 0; color: #718096; font-size: 14px;">Environment: ${Deno.env.get("DENO_DEPLOYMENT_ID") || "local"}</p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
                <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">TrueSpend Diagnostics - Temporary Test</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("[Resend Test] Email send error:", emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailError.message,
          details: emailError 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Store code in database for verification
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: codeRecord, error: dbError } = await supabase
      .from("test_email_codes")
      .insert({
        email: ALLOWED_EMAIL,
        code: testCode,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (dbError || !codeRecord) {
      console.error("[Resend Test] Failed to store code:", dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to store verification code",
          details: dbError 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[Resend Test] ✅ Email sent and code stored. Session ID: ${codeRecord.id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        to: ALLOWED_EMAIL,
        sentAt,
        sessionId: codeRecord.id,
        expiresIn: 600 // seconds
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[Resend Test] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send test email",
        details: error.response?.data || null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
