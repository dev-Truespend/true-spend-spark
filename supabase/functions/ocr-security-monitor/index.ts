// Security monitor for OCR abuse detection and prevention
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AbusePattern {
  ipHash: string;
  userId?: string;
  requestCount: number;
  anomalyScore: number;
  patterns: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Security Monitor] Running security scan...');

    const actions = {
      blocked: 0,
      warned: 0,
      anomaliesDetected: 0,
    };

    // 1. Check for IP-based abuse patterns
    const { data: recentRequests } = await supabase
      .from('google_vision_cost_tracking')
      .select('user_id, created_at')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentRequests) {
      // Group by user and detect rapid requests
      const userRequestCounts = recentRequests.reduce((acc, req) => {
        acc[req.user_id] = (acc[req.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [userId, count] of Object.entries(userRequestCounts)) {
        if (count > 100) {
          console.log(`[Security] High request volume detected for user ${userId}: ${count} requests/hour`);
          
          // Check for anomalies
          const { data: anomalyData } = await supabase.rpc('detect_ocr_anomalies', {
            p_user_id: userId,
          });

          if (anomalyData?.anomalies_detected) {
            actions.anomaliesDetected++;
            
            // Log anomaly patterns
            for (const anomaly of anomalyData.anomalies) {
              await supabase.from('ocr_anomaly_patterns').insert({
                user_id: userId,
                pattern_type: anomaly.type,
                severity: anomaly.severity,
                pattern_data: anomaly.details,
              });
            }

            // If severity is high, consider temporary blocking
            const hasHighSeverity = anomalyData.anomalies.some(
              (a: any) => a.severity === 'high'
            );

            if (hasHighSeverity) {
              console.log(`[Security] Blocking user ${userId} for 1 hour due to high severity anomaly`);
              
              await supabase.from('ocr_abuse_tracking').upsert({
                user_id: userId,
                ip_address_hash: 'system_blocked',
                request_count: count,
                anomaly_score: 100,
                suspicious_patterns: anomalyData.anomalies,
                blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              });

              actions.blocked++;
            } else {
              actions.warned++;
            }
          }
        }
      }
    }

    // 2. Check for failed authentication patterns
    const { data: failedRequests } = await supabase
      .from('google_vision_cost_tracking')
      .select('user_id, error_message')
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (failedRequests && failedRequests.length > 0) {
      const userFailures = failedRequests.reduce((acc, req) => {
        acc[req.user_id] = (acc[req.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [userId, failCount] of Object.entries(userFailures)) {
        if (failCount > 20) {
          console.log(`[Security] High failure rate for user ${userId}: ${failCount} failures/hour`);
          
          await supabase.from('ocr_anomaly_patterns').insert({
            user_id: userId,
            pattern_type: 'high_failure_rate',
            severity: 'medium',
            pattern_data: {
              failure_count: failCount,
              timeframe: '1 hour',
            },
          });

          actions.warned++;
        }
      }
    }

    // 3. Clean up expired request signatures and old tracking data
    await supabase.rpc('cleanup_expired_request_signatures');
    
    await supabase
      .from('ocr_abuse_tracking')
      .delete()
      .lt('last_seen', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // 4. Resolve old anomalies
    await supabase
      .from('ocr_anomaly_patterns')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('resolved', false)
      .lt('detection_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log('[Security Monitor] Scan complete:', actions);

    return new Response(
      JSON.stringify({
        success: true,
        actions,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Security Monitor] Error:', error);
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
