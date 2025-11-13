import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Check if max attempts exceeded
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum verification attempts exceeded. Please request a new code.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempts
    const { error: updateError } = await supabase
      .from('mfa_email_codes')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error updating attempts:', updateError);
    }

    // Verify code
    if (otpRecord.code !== code) {
      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid code',
          remainingAttempts
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
