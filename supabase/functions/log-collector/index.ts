/**
 * Phase 10: Observability & Polish - Log Collector Edge Function
 * Receives structured logs from client and stores in system_logs table
 * Triggers incident detection for critical/error logs
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  component: string;
  metadata?: Record<string, any>;
  user_id?: string;
  request_id?: string;
  trace_id?: string;
  stack_trace?: string;
  user_agent?: string;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const logData: LogEntry = await req.json();

    console.log(`[log-collector] Received ${logData.level} log from ${logData.component}`);

    // Validate required fields
    if (!logData.level || !logData.message || !logData.component) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: level, message, component' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Hash IP address if available (from headers)
    let ipAddressHash: string | undefined;
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      const ip = forwardedFor.split(',')[0].trim();
      // Simple hash for privacy (in production, use proper hashing)
      ipAddressHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(ip + 'truespend_salt_2024')
      ).then(buf => 
        Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      );
    }

    // Insert log into system_logs table
    const { error: insertError } = await supabase
      .from('system_logs')
      .insert({
        level: logData.level,
        message: logData.message,
        component: logData.component,
        metadata: logData.metadata || {},
        user_id: logData.user_id || null,
        request_id: logData.request_id || null,
        trace_id: logData.trace_id || null,
        stack_trace: logData.stack_trace || null,
        user_agent: logData.user_agent || null,
        ip_address_hash: ipAddressHash,
        timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date(),
      });

    if (insertError) {
      console.error('[log-collector] Insert error:', insertError);
      throw insertError;
    }

    // Trigger incident detection for critical/error logs
    // This is async and won't block the response
    if (logData.level === 'critical' || logData.level === 'error') {
      // Check for high error rate patterns
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const { data: recentErrors, error: countError } = await supabase
        .from('system_logs')
        .select('id', { count: 'exact', head: true })
        .in('level', ['error', 'critical'])
        .gte('timestamp', fiveMinutesAgo.toISOString());

      if (!countError && recentErrors) {
        const errorCount = recentErrors.length;
        
        // If more than 10 errors in 5 minutes, create incident
        if (errorCount >= 10) {
          await supabase.from('incidents').insert({
            severity: 'high',
            status: 'open',
            title: `High Error Rate Detected (${errorCount} errors in 5 min)`,
            description: `Automated detection: ${errorCount} errors/critical logs in the last 5 minutes. Component: ${logData.component}`,
            affected_services: [logData.component],
            auto_detected: true,
            metadata: {
              error_count: errorCount,
              detection_time: new Date().toISOString(),
              sample_log: {
                message: logData.message,
                component: logData.component,
              },
            },
          });

          console.log('[log-collector] Created incident for high error rate');
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        log_id: 'stored',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[log-collector] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to store log entry',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
