/**
 * Phase 10: Observability - Incident Auto-Detection
 * Monitors system metrics and logs to automatically detect incidents
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionRule {
  metric: string;
  threshold: number;
  duration: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const DETECTION_RULES: DetectionRule[] = [
  { metric: 'error_rate', threshold: 5, duration: 5, severity: 'critical' },
  { metric: 'api_latency_p95', threshold: 2000, duration: 10, severity: 'high' },
  { metric: 'auth_failures', threshold: 10, duration: 5, severity: 'high' },
  { metric: 'cache_miss_rate', threshold: 80, duration: 15, severity: 'medium' },
  { metric: 'system_health_score', threshold: 70, duration: 10, severity: 'high' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting incident detection...');

    const incidents: any[] = [];

    // Check each detection rule
    for (const rule of DETECTION_RULES) {
      const startTime = new Date(Date.now() - rule.duration * 60 * 1000).toISOString();
      
      let shouldCreateIncident = false;
      let metricValue = 0;
      let affectedServices: string[] = [];

      // Analyze based on metric type
      switch (rule.metric) {
        case 'error_rate': {
          const { data: errorLogs } = await supabase
            .from('system_logs')
            .select('*')
            .in('level', ['error', 'critical'])
            .gte('timestamp', startTime);

          const totalRequests = await getTotalRequests(supabase, startTime);
          metricValue = totalRequests > 0 ? (errorLogs?.length || 0) / totalRequests * 100 : 0;
          shouldCreateIncident = metricValue > rule.threshold;
          affectedServices = ['api-gateway', 'backend'];
          break;
        }

        case 'api_latency_p95': {
          const { data: metrics } = await supabase
            .from('system_metrics')
            .select('value')
            .eq('metric_name', 'api_latency_p95')
            .gte('timestamp', startTime)
            .order('value', { ascending: false })
            .limit(1)
            .single();

          metricValue = metrics?.value || 0;
          shouldCreateIncident = metricValue > rule.threshold;
          affectedServices = ['api-gateway', 'edge-functions'];
          break;
        }

        case 'auth_failures': {
          const { data: authLogs } = await supabase
            .from('system_logs')
            .select('*')
            .eq('component', 'auth')
            .in('level', ['error', 'warn'])
            .gte('timestamp', startTime);

          metricValue = authLogs?.length || 0;
          shouldCreateIncident = metricValue > rule.threshold;
          affectedServices = ['authentication', 'user-management'];
          break;
        }

        case 'cache_miss_rate': {
          const { data: cacheMetrics } = await supabase
            .from('cache_analytics')
            .select('*')
            .gte('timestamp', startTime);

          const total = cacheMetrics?.length || 0;
          const hits = cacheMetrics?.filter(m => m.operation === 'hit').length || 0;
          metricValue = total > 0 ? (1 - hits / total) * 100 : 0;
          shouldCreateIncident = metricValue > rule.threshold;
          affectedServices = ['cache', 'performance'];
          break;
        }

        case 'system_health_score': {
          const { data: healthMetrics } = await supabase
            .from('system_metrics')
            .select('value')
            .eq('metric_name', 'system_health_score')
            .gte('timestamp', startTime)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          metricValue = healthMetrics?.value || 100;
          shouldCreateIncident = metricValue < rule.threshold;
          affectedServices = ['system', 'infrastructure'];
          break;
        }
      }

      // Create incident if threshold exceeded
      if (shouldCreateIncident) {
        // Check if incident already exists and is open
        const { data: existingIncident } = await supabase
          .from('incidents')
          .select('id')
          .eq('title', `${rule.metric} threshold exceeded`)
          .eq('status', 'open')
          .maybeSingle();

        if (!existingIncident) {
          const { data: incident, error } = await supabase
            .from('incidents')
            .insert({
              title: `${rule.metric} threshold exceeded`,
              description: `${rule.metric} has exceeded threshold of ${rule.threshold}. Current value: ${metricValue.toFixed(2)}`,
              severity: rule.severity,
              status: 'open',
              affected_services: affectedServices,
              auto_detected: true,
              metadata: {
                rule: rule.metric,
                threshold: rule.threshold,
                current_value: metricValue,
                duration_minutes: rule.duration,
              },
            })
            .select()
            .single();

          if (error) {
            console.error(`Error creating incident for ${rule.metric}:`, error);
          } else {
            console.log(`Created incident for ${rule.metric}:`, incident.id);
            incidents.push(incident);

            // Send alert for critical incidents
            if (rule.severity === 'critical' || rule.severity === 'high') {
              await sendAlert(supabase, incident);
            }
          }
        }
      }
    }

    // Auto-resolve incidents if metrics return to normal
    await autoResolveIncidents(supabase);

    console.log(`Incident detection complete. Created ${incidents.length} new incidents.`);

    return new Response(
      JSON.stringify({
        success: true,
        incidents_created: incidents.length,
        incidents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in incident detection:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function getTotalRequests(supabase: any, startTime: string): Promise<number> {
  const { data } = await supabase
    .from('api_request_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startTime);
  
  return data?.length || 100; // Default to 100 to avoid division by zero
}

async function sendAlert(supabase: any, incident: any): Promise<void> {
  try {
    // Create alert record
    const { error } = await supabase
      .from('incident_alerts')
      .insert({
        incident_id: incident.id,
        channel: 'system_notification',
        status: 'sent',
        recipient: 'system_admin',
      });

    if (error) {
      console.error('Error creating alert record:', error);
    }

    // Log the alert
    await supabase
      .from('system_logs')
      .insert({
        level: 'critical',
        message: `Incident Alert: ${incident.title}`,
        component: 'incident-detector',
        metadata: {
          incident_id: incident.id,
          severity: incident.severity,
        },
      });

    console.log(`Alert sent for incident: ${incident.id}`);
  } catch (error) {
    console.error('Error sending alert:', error);
  }
}

async function autoResolveIncidents(supabase: any): Promise<void> {
  try {
    // Get all open auto-detected incidents
    const { data: openIncidents } = await supabase
      .from('incidents')
      .select('*')
      .eq('status', 'open')
      .eq('auto_detected', true);

    if (!openIncidents) return;

    const now = new Date();
    const checkWindow = new Date(now.getTime() - 15 * 60 * 1000).toISOString(); // Last 15 minutes

    for (const incident of openIncidents) {
      const metadata = incident.metadata || {};
      const rule = metadata.rule;
      const threshold = metadata.threshold;
      
      let shouldResolve = false;

      // Check if metrics are back to normal
      if (rule === 'error_rate') {
        const { data: errorLogs } = await supabase
          .from('system_logs')
          .select('*')
          .in('level', ['error', 'critical'])
          .gte('timestamp', checkWindow);

        const totalRequests = await getTotalRequests(supabase, checkWindow);
        const currentRate = totalRequests > 0 ? (errorLogs?.length || 0) / totalRequests * 100 : 0;
        shouldResolve = currentRate < threshold * 0.8; // 80% of threshold
      } else if (rule === 'system_health_score') {
        const { data: healthMetrics } = await supabase
          .from('system_metrics')
          .select('value')
          .eq('metric_name', 'system_health_score')
          .gte('timestamp', checkWindow)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        shouldResolve = (healthMetrics?.value || 0) > threshold * 1.1; // 110% of threshold
      }

      if (shouldResolve) {
        await supabase
          .from('incidents')
          .update({
            status: 'resolved',
            resolved_at: now.toISOString(),
            metadata: {
              ...metadata,
              auto_resolved: true,
              resolved_reason: 'Metrics returned to normal levels',
            },
          })
          .eq('id', incident.id);

        console.log(`Auto-resolved incident: ${incident.id}`);
      }
    }
  } catch (error) {
    console.error('Error in auto-resolve:', error);
  }
}
