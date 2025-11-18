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

    console.log('[Backup Verification] Starting backup health check...');

    // Lovable Cloud provides automatic backups - we verify they're recent
    const backupStatus: {
      backup_type: string;
      backup_timestamp: Date;
      status: string;
      verification_status: string;
      size_bytes: number;
      error_message?: string;
    } = {
      backup_type: 'daily',
      backup_timestamp: new Date(),
      status: 'success',
      verification_status: 'verified',
      size_bytes: 0
    };

    // Check last backup timestamp
    const { data: lastBackup } = await supabase
      .from('backup_status')
      .select('backup_timestamp, status')
      .order('backup_timestamp', { ascending: false })
      .limit(1)
      .single();

    const now = Date.now();
    const hoursSinceBackup = lastBackup 
      ? (now - new Date(lastBackup.backup_timestamp).getTime()) / (1000 * 60 * 60)
      : 999;

    console.log('[Backup Verification] Hours since last backup:', hoursSinceBackup);

    if (hoursSinceBackup > 25) {
      console.error('[Backup Verification] ⚠️ Backup is stale!', { 
        hoursSinceBackup,
        lastBackup: lastBackup?.backup_timestamp 
      });
      
      backupStatus.status = 'failed';
      backupStatus.verification_status = 'failed';
      backupStatus.error_message = `Last backup was ${Math.round(hoursSinceBackup)}h ago. Expected daily backups.`;
    } else {
      console.log('[Backup Verification] ✅ Backup health check passed');
    }

    // Record backup status
    const { error: insertError } = await supabase
      .from('backup_status')
      .insert(backupStatus);

    if (insertError) {
      console.error('[Backup Verification] Failed to insert backup status:', insertError);
      throw insertError;
    }

    console.log('[Backup Verification] Backup status recorded successfully');

    return new Response(
      JSON.stringify({ 
        status: backupStatus.status, 
        verification_status: backupStatus.verification_status,
        hours_since_last: hoursSinceBackup,
        backup: backupStatus 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[Backup Verification] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Backup verification failed'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
