/**
 * Phase 10: Alert Manager Edge Function
 * Handles alert routing, deduplication, escalation, and delivery
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  incidentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  name: string;
  severity: string;
  channels: string[];
  user_ids: string[];
  escalation_timeout_minutes: number;
  active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const alertRequest: AlertRequest = await req.json();
    console.log('Processing alert:', alertRequest);

    // Check for duplicate alerts in last 5 minutes
    const { data: recentAlerts } = await supabase
      .from('alert_history')
      .select('id, sent_at')
      .eq('incident_id', alertRequest.incidentId)
      .gte('sent_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      console.log('Duplicate alert detected, skipping');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Alert deduplicated',
          deduplicated: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get matching alert rules
    const { data: alertRules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('active', true)
      .eq('severity', alertRequest.severity);

    if (rulesError) {
      throw new Error(`Failed to fetch alert rules: ${rulesError.message}`);
    }

    if (!alertRules || alertRules.length === 0) {
      console.log('No matching alert rules found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No alert rules matched' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deliveryResults: any[] = [];

    // Process each alert rule
    for (const rule of alertRules as AlertRule[]) {
      console.log(`Processing rule: ${rule.name}`);

      // Get admin users if user_ids is empty
      let recipients = rule.user_ids;
      if (recipients.length === 0) {
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        
        recipients = adminUsers?.map(u => u.user_id) || [];
      }

      // Get user emails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', recipients);

      if (!profiles || profiles.length === 0) {
        console.log('No recipients found for rule');
        continue;
      }

      // Send alerts via configured channels
      for (const channel of rule.channels) {
        for (const profile of profiles) {
          try {
            let deliveryResult: any = { success: false };

            if (channel === 'email') {
              deliveryResult = await sendEmailAlert(
                supabase,
                profile.email,
                alertRequest
              );
            } else if (channel === 'push') {
              deliveryResult = await sendPushAlert(
                supabase,
                profile.id,
                alertRequest
              );
            }

            // Record alert history
            await supabase.from('alert_history').insert({
              incident_id: alertRequest.incidentId,
              alert_rule_id: rule.id,
              channel,
              recipient: channel === 'email' ? profile.email : profile.id,
              status: deliveryResult.success ? 'sent' : 'failed',
              error_message: deliveryResult.error || null,
              metadata: {
                severity: alertRequest.severity,
                title: alertRequest.title,
                ...alertRequest.metadata
              }
            });

            deliveryResults.push({
              rule: rule.name,
              channel,
              recipient: profile.email,
              success: deliveryResult.success,
              error: deliveryResult.error
            });

          } catch (error) {
            console.error(`Failed to send ${channel} alert:`, error);
            deliveryResults.push({
              rule: rule.name,
              channel,
              recipient: profile.email,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Alerts processed',
        deliveryResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in alert-manager:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendEmailAlert(
  supabase: any,
  recipientEmail: string,
  alert: AlertRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email-notification', {
      body: {
        to: recipientEmail,
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        html: `
          <h2>System Alert</h2>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Title:</strong> ${alert.title}</p>
          <p><strong>Description:</strong> ${alert.description}</p>
          <p>Please check the admin dashboard for more details.</p>
        `,
        metadata: {
          type: 'alert',
          severity: alert.severity,
          incident_id: alert.incidentId
        }
      }
    });

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email delivery failed' 
    };
  }
}

async function sendPushAlert(
  supabase: any,
  userId: string,
  alert: AlertRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        title: alert.title,
        body: alert.description,
        data: {
          type: 'alert',
          severity: alert.severity,
          incident_id: alert.incidentId
        }
      }
    });

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Push notification failed' 
    };
  }
}
