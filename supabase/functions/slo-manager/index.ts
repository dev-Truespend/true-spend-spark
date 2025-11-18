/**
 * Phase 10: Observability - SLI/SLO Management API
 * Tracks Service Level Indicators and Objectives
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SLI {
  name: string;
  type: 'availability' | 'latency' | 'error_rate' | 'throughput' | 'custom';
  current_value: number;
  target_value: number;
  measurement_window: string;
}

interface SLOCompliance {
  slo_name: string;
  compliance_percentage: number;
  breached: boolean;
  breach_duration_minutes?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'calculate_slis': {
        const { time_window = '1h' } = params;
        const slis = await calculateSLIs(supabase, time_window);
        
        return new Response(
          JSON.stringify({ success: true, slis }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_slos': {
        const { time_window = '1h' } = params;
        const compliance = await checkSLOCompliance(supabase, time_window);
        
        // Create incidents for breached SLOs
        for (const slo of compliance.filter(s => s.breached)) {
          const existingIncident = await supabase
            .from('incidents')
            .select('id')
            .eq('title', `SLO Breach: ${slo.slo_name}`)
            .eq('status', 'open')
            .maybeSingle();

          if (!existingIncident.data) {
            const { data: newIncident } = await supabase.from('incidents').insert({
              title: `SLO Breach: ${slo.slo_name}`,
              description: `SLO compliance dropped to ${slo.compliance_percentage.toFixed(2)}%`,
              severity: 'high',
              status: 'open',
              affected_services: ['observability'],
              auto_detected: true,
              metadata: { slo_name: slo.slo_name, compliance: slo.compliance_percentage },
            }).select().single();
            
            if (newIncident) {
              // Trigger alert for SLO breach
              try {
                await supabase.functions.invoke('alert-manager', {
                  body: {
                    incidentId: newIncident.id,
                    severity: 'high',
                    title: newIncident.title,
                    description: newIncident.description,
                    metadata: {
                      slo_name: slo.slo_name,
                      compliance: slo.compliance_percentage,
                      event_type: 'slo_breach'
                    }
                  }
                });
                console.log('Alert triggered for SLO breach:', newIncident.id);
              } catch (alertError) {
                console.error('Failed to trigger SLO alert:', alertError);
              }
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, compliance }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_slo_history': {
        const { slo_name, days = 7 } = params;
        
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - days);

        const { data, error } = await supabase
          .from('slo_compliance_history')
          .select('*')
          .eq('slo_name', slo_name)
          .gte('timestamp', startTime.toISOString())
          .order('timestamp', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, history: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_all_slos': {
        const { data, error } = await supabase
          .from('service_level_objectives')
          .select('*')
          .eq('active', true)
          .order('priority', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, slos: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_slo': {
        const { slo_id, target_percentage, warning_threshold } = params;

        const { data, error } = await supabase
          .from('service_level_objectives')
          .update({ target_percentage, warning_threshold })
          .eq('id', slo_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, slo: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in SLO manager:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function calculateSLIs(supabase: any, timeWindow: string): Promise<SLI[]> {
  const startTime = new Date();
  switch (timeWindow) {
    case '15m':
      startTime.setMinutes(startTime.getMinutes() - 15);
      break;
    case '1h':
      startTime.setHours(startTime.getHours() - 1);
      break;
    case '24h':
      startTime.setHours(startTime.getHours() - 24);
      break;
    case '7d':
      startTime.setDate(startTime.getDate() - 7);
      break;
  }

  const slis: SLI[] = [];

  // API Availability SLI
  const { data: apiMetrics } = await supabase
    .from('api_request_log')
    .select('status_code')
    .gte('created_at', startTime.toISOString());

  if (apiMetrics && apiMetrics.length > 0) {
    const successfulRequests = apiMetrics.filter(
      (m: any) => m.status_code >= 200 && m.status_code < 500
    ).length;
    const availability = (successfulRequests / apiMetrics.length) * 100;
    
    slis.push({
      name: 'API Availability',
      type: 'availability',
      current_value: availability,
      target_value: 99.9,
      measurement_window: timeWindow,
    });
  }

  // API Latency SLI (P95)
  const { data: latencyMetrics } = await supabase
    .from('api_request_log')
    .select('response_time_ms')
    .gte('created_at', startTime.toISOString())
    .not('response_time_ms', 'is', null)
    .order('response_time_ms', { ascending: true });

  if (latencyMetrics && latencyMetrics.length > 0) {
    const p95Index = Math.floor(latencyMetrics.length * 0.95);
    const p95Latency = latencyMetrics[p95Index]?.response_time_ms || 0;
    
    slis.push({
      name: 'API Latency P95',
      type: 'latency',
      current_value: p95Latency,
      target_value: 500, // 500ms target
      measurement_window: timeWindow,
    });
  }

  // Error Rate SLI
  const { data: errorMetrics } = await supabase
    .from('system_logs')
    .select('level')
    .gte('timestamp', startTime.toISOString());

  if (errorMetrics && errorMetrics.length > 0) {
    const errors = errorMetrics.filter((m: any) => m.level === 'error').length;
    const errorRate = (errors / errorMetrics.length) * 100;
    
    slis.push({
      name: 'Error Rate',
      type: 'error_rate',
      current_value: errorRate,
      target_value: 1.0, // 1% max error rate
      measurement_window: timeWindow,
    });
  }

  // Authentication Success Rate SLI
  const { data: authMetrics } = await supabase
    .from('auth_attempts')
    .select('success')
    .gte('created_at', startTime.toISOString());

  if (authMetrics && authMetrics.length > 0) {
    const successfulAuth = authMetrics.filter((m: any) => m.success).length;
    const authSuccessRate = (successfulAuth / authMetrics.length) * 100;
    
    slis.push({
      name: 'Auth Success Rate',
      type: 'availability',
      current_value: authSuccessRate,
      target_value: 99.5,
      measurement_window: timeWindow,
    });
  }

  return slis;
}

async function checkSLOCompliance(supabase: any, timeWindow: string): Promise<SLOCompliance[]> {
  const slis = await calculateSLIs(supabase, timeWindow);
  const compliance: SLOCompliance[] = [];

  // Get configured SLOs
  const { data: slos } = await supabase
    .from('service_level_objectives')
    .select('*')
    .eq('active', true);

  for (const slo of slos || []) {
    const matchingSli = slis.find(sli => sli.name === slo.slo_name);
    
    if (matchingSli) {
      let compliancePercentage: number;
      
      if (slo.indicator_type === 'latency' || slo.indicator_type === 'error_rate') {
        // For latency and error_rate, lower is better
        compliancePercentage = matchingSli.current_value <= slo.target_percentage 
          ? 100 
          : (slo.target_percentage / matchingSli.current_value) * 100;
      } else {
        // For availability, higher is better
        compliancePercentage = (matchingSli.current_value / slo.target_percentage) * 100;
      }

      const breached = compliancePercentage < 100;

      compliance.push({
        slo_name: slo.slo_name,
        compliance_percentage: Math.min(compliancePercentage, 100),
        breached,
      });

      // Store compliance history
      await supabase.from('slo_compliance_history').insert({
        slo_id: slo.id,
        slo_name: slo.slo_name,
        compliance_percentage: Math.min(compliancePercentage, 100),
        actual_value: matchingSli.current_value,
        target_value: slo.target_percentage,
        breached,
      });
    }
  }

  return compliance;
}
