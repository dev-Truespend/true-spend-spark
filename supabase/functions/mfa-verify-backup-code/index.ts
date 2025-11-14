import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userId, code } = await req.json();

    if (!userId || !code) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the provided code
    const encoder = new TextEncoder();
    const data = encoder.encode(code.toUpperCase().replace(/\s/g, ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedCode = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find unused backup code
    const { data: backupCode, error: findError } = await supabaseClient
      .from('mfa_backup_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('code', hashedCode)
      .is('used_at', null)
      .single();

    if (findError || !backupCode) {
      // Log failed attempt
      await supabaseClient.from('security_logs').insert({
        user_id: userId,
        event_type: 'mfa_backup_code_failed',
        severity: 'warn',
        details: { success: false },
      });

      console.log('Invalid backup code for user:', userId);

      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or already used backup code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark backup code as used
    const { error: updateError } = await supabaseClient
      .from('mfa_backup_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', backupCode.id);

    if (updateError) {
      console.error('Error marking backup code as used:', updateError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to verify backup code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check remaining backup codes
    const { data: remainingCodes, error: countError } = await supabaseClient
      .from('mfa_backup_codes')
      .select('id')
      .eq('user_id', userId)
      .is('used_at', null);

    const remainingCount = remainingCodes?.length || 0;

    // Log successful verification
    await supabaseClient.from('security_logs').insert({
      user_id: userId,
      event_type: 'mfa_backup_code_used',
      severity: 'info',
      details: { success: true, remaining_codes: remainingCount },
    });

    console.log('Backup code verified for user:', userId, 'Remaining codes:', remainingCount);

    return new Response(
      JSON.stringify({ 
        valid: true,
        remainingCodes: remainingCount,
        warning: remainingCount < 3 ? 'You have less than 3 backup codes remaining. Generate new codes soon.' : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mfa-verify-backup-code:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
