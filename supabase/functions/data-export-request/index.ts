import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Exporting data for user:', user.id);

    // Gather all user data (GDPR-compliant)
    const [profile, transactions, budgets, geofences, auditLogs, mfaSettings, notificationPrefs] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('budgets').select('*').eq('user_id', user.id),
      supabase.from('geofences').select('*').eq('user_id', user.id),
      supabase.from('data_access_audit').select('*').eq('user_id', user.id),
      supabase.from('mfa_settings').select('totp_enabled, enabled_at, last_verified_at').eq('user_id', user.id).single(),
      supabase.from('notification_preferences').select('*').eq('user_id', user.id).single()
    ]);

    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        format_version: '1.0',
        user_id: user.id,
        export_type: 'GDPR_FULL_DATA_EXPORT'
      },
      profile: profile.data,
      transactions: transactions.data || [],
      budgets: budgets.data || [],
      geofences: geofences.data || [],
      mfa_settings: mfaSettings.data,
      notification_preferences: notificationPrefs.data,
      audit_logs: auditLogs.data || [],
      data_summary: {
        total_transactions: transactions.data?.length || 0,
        total_budgets: budgets.data?.length || 0,
        total_geofences: geofences.data?.length || 0,
        total_audit_logs: auditLogs.data?.length || 0
      }
    };

    // Log the export request in audit trail
    await supabase.from('data_access_audit').insert({
      user_id: user.id,
      table_name: 'ALL_TABLES',
      operation: 'SELECT',
      accessed_fields: { 
        export_type: 'GDPR_DATA_EXPORT',
        tables_exported: ['profiles', 'transactions', 'budgets', 'geofences', 'mfa_settings', 'notification_preferences', 'data_access_audit']
      }
    });

    console.log('Data export completed for user:', user.id);

    return new Response(
      JSON.stringify(exportData), 
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="truespend-data-export-${user.id}-${Date.now()}.json"`
        }
      }
    );
  } catch (error) {
    console.error('Data export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to export user data'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
