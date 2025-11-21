// Automated maintenance tasks for OCR system
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Maintenance] Starting automated maintenance tasks...');

    const results: Record<string, any> = {};

    // 1. Cleanup old OCR data
    console.log('[Maintenance] Cleaning up old OCR data...');
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
      'cleanup_old_ocr_data'
    );

    if (cleanupError) {
      console.error('[Maintenance] Cleanup error:', cleanupError);
      results.cleanup = { error: cleanupError.message };
    } else {
      console.log('[Maintenance] Cleanup complete:', cleanupResult);
      results.cleanup = cleanupResult;
    }

    // 2. Cleanup expired request signatures
    console.log('[Maintenance] Cleaning up expired request signatures...');
    const { data: signaturesDeleted, error: sigError } = await supabase.rpc(
      'cleanup_expired_request_signatures'
    );

    if (sigError) {
      console.error('[Maintenance] Signature cleanup error:', sigError);
      results.signatures = { error: sigError.message };
    } else {
      console.log(`[Maintenance] Deleted ${signaturesDeleted} expired signatures`);
      results.signatures = { deleted: signaturesDeleted };
    }

    // 3. Cleanup old rate limit records
    console.log('[Maintenance] Cleaning up old rate limits...');
    const { data: rateLimitsDeleted, error: rlError } = await supabase.rpc(
      'cleanup_old_rate_limits'
    );

    if (rlError) {
      console.error('[Maintenance] Rate limit cleanup error:', rlError);
      results.rate_limits = { error: rlError.message };
    } else {
      console.log(`[Maintenance] Deleted ${rateLimitsDeleted} old rate limits`);
      results.rate_limits = { deleted: rateLimitsDeleted };
    }

    // 4. Vacuum analyze critical tables for performance
    console.log('[Maintenance] Analyzing table statistics...');
    results.analyze = { status: 'skipped', note: 'Table analysis requires elevated DB privileges' };

    // 5. Generate health report
    console.log('[Maintenance] Generating health report...');
    const { data: healthData } = await supabase
      .from('ocr_system_health')
      .select('*')
      .single();

    results.health = healthData || { error: 'Unable to fetch health data' };

    // 6. Check for queue backlog
    const { data: queueStatus } = await supabase
      .from('ocr_queue_status')
      .select('*');

    results.queue_status = queueStatus || [];

    // 7. Summary statistics
    const summary = {
      timestamp: new Date().toISOString(),
      maintenance_tasks_completed: Object.keys(results).length,
      system_health: healthData || null,
      recommendations: [] as Array<{ level: string; message: string }>,
    };

    // Add recommendations based on health metrics
    if (healthData) {
      if (healthData.success_rate < 90) {
        summary.recommendations.push({
          level: 'warning',
          message: `Success rate is ${healthData.success_rate}%, consider investigating failures`,
        });
      }

      if (healthData.pending_queue > 100) {
        summary.recommendations.push({
          level: 'warning',
          message: `High queue backlog: ${healthData.pending_queue} items pending`,
        });
      }

      if (healthData.active_anomalies > 10) {
        summary.recommendations.push({
          level: 'alert',
          message: `${healthData.active_anomalies} active security anomalies require attention`,
        });
      }

      if (healthData.total_cost > 50) {
        summary.recommendations.push({
          level: 'info',
          message: `High hourly cost: $${healthData.total_cost}, monitor for cost optimization`,
        });
      }
    }

    console.log('[Maintenance] Maintenance complete');
    console.log('[Maintenance] Summary:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Maintenance] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
