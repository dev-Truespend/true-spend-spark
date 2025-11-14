import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, number[]>();

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
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
    
    console.log(`[Verify Code] Request from IP: ${clientIp}`);

    // Rate limiting
    if (isRateLimited(clientIp)) {
      console.log(`[Verify Code] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait a minute." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { sessionId, code } = await req.json();

    if (!sessionId || !code) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId or code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          message: "Invalid code format. Please enter 6 digits.",
          attemptsRemaining: null
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[Verify Code] Verifying code for session: ${sessionId}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lookup the code
    const { data: codeRecord, error: lookupError } = await supabase
      .from("test_email_codes")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (lookupError || !codeRecord) {
      console.error(`[Verify Code] Code not found: ${lookupError?.message}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          message: "Invalid or expired session.",
          attemptsRemaining: null
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (new Date(codeRecord.expires_at) < new Date()) {
      console.log(`[Verify Code] Code expired for session: ${sessionId}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          message: "This code has expired. Please request a new one.",
          expired: true
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already verified
    if (codeRecord.verified) {
      console.log(`[Verify Code] Code already verified for session: ${sessionId}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          verified: true,
          message: "This code was already verified!",
          verifiedAt: codeRecord.created_at
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check max attempts
    if (codeRecord.attempts >= 3) {
      console.log(`[Verify Code] Max attempts reached for session: ${sessionId}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          message: "Maximum verification attempts reached. Please request a new code.",
          attemptsRemaining: 0
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the code
    if (codeRecord.code === code) {
      // Success! Mark as verified
      const { error: updateError } = await supabase
        .from("test_email_codes")
        .update({ verified: true })
        .eq("id", sessionId);

      if (updateError) {
        console.error(`[Verify Code] Failed to mark as verified: ${updateError.message}`);
      }

      console.log(`[Verify Code] ✅ Code verified successfully for session: ${sessionId}`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          verified: true,
          message: "Code verified successfully! 🎉",
          verifiedAt: new Date().toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      // Wrong code - increment attempts
      const newAttempts = codeRecord.attempts + 1;
      const { error: updateError } = await supabase
        .from("test_email_codes")
        .update({ attempts: newAttempts })
        .eq("id", sessionId);

      if (updateError) {
        console.error(`[Verify Code] Failed to increment attempts: ${updateError.message}`);
      }

      const attemptsRemaining = 3 - newAttempts;
      console.log(`[Verify Code] ❌ Invalid code. Attempts remaining: ${attemptsRemaining}`);

      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          message: `Invalid code. ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.`,
          attemptsRemaining
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error(`[Verify Code] Exception:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
