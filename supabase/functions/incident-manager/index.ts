/**
 * Phase 10: Observability - Incident Management API
 * CRUD operations for incidents and incident alerts
 */

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
    const { action, incident_id, ...params } = body;

    switch (action) {
      case 'list': {
        const { status, severity, limit = 50 } = params;
        
        let query = supabase
          .from('incidents')
          .select('*, incident_alerts(*)')
          .order('started_at', { ascending: false })
          .limit(limit);

        if (status) {
          query = query.eq('status', status);
        }
        if (severity) {
          query = query.eq('severity', severity);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, incidents: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!incident_id) {
          return new Response(
            JSON.stringify({ error: 'incident_id required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const { data, error } = await supabase
          .from('incidents')
          .select('*, incident_alerts(*)')
          .eq('id', incident_id)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, incident: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const { title, description, severity, affected_services } = params;

        if (!title || !severity) {
          return new Response(
            JSON.stringify({ error: 'title and severity required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const { data, error } = await supabase
          .from('incidents')
          .insert({
            title,
            description,
            severity,
            status: 'open',
            affected_services: affected_services || [],
            auto_detected: false,
          })
          .select()
          .single();

        if (error) throw error;

        // Log the incident creation
        await supabase
          .from('system_logs')
          .insert({
            level: 'warn',
            message: `Incident created: ${title}`,
            component: 'incident-manager',
            user_id: user.id,
            metadata: {
              incident_id: data.id,
              severity,
            },
          });

        return new Response(
          JSON.stringify({ success: true, incident: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!incident_id) {
          return new Response(
            JSON.stringify({ error: 'incident_id required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const { data, error } = await supabase
          .from('incidents')
          .update(params)
          .eq('id', incident_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, incident: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'resolve': {
        if (!incident_id) {
          return new Response(
            JSON.stringify({ error: 'incident_id required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const { data, error } = await supabase
          .from('incidents')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
          })
          .eq('id', incident_id)
          .select()
          .single();

        if (error) throw error;

        // Log the resolution
        await supabase
          .from('system_logs')
          .insert({
            level: 'info',
            message: `Incident resolved: ${data.title}`,
            component: 'incident-manager',
            user_id: user.id,
            metadata: {
              incident_id: data.id,
            },
          });

        return new Response(
          JSON.stringify({ success: true, incident: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'statistics': {
        const { timeRange = '24h' } = params;
        
        const startTime = new Date();
        switch (timeRange) {
          case '1h':
            startTime.setHours(startTime.getHours() - 1);
            break;
          case '24h':
            startTime.setHours(startTime.getHours() - 24);
            break;
          case '7d':
            startTime.setDate(startTime.getDate() - 7);
            break;
          case '30d':
            startTime.setDate(startTime.getDate() - 30);
            break;
        }

        const { data: incidents } = await supabase
          .from('incidents')
          .select('*')
          .gte('started_at', startTime.toISOString());

        const stats = {
          total: incidents?.length || 0,
          open: incidents?.filter(i => i.status === 'open').length || 0,
          resolved: incidents?.filter(i => i.status === 'resolved').length || 0,
          by_severity: {
            low: incidents?.filter(i => i.severity === 'low').length || 0,
            medium: incidents?.filter(i => i.severity === 'medium').length || 0,
            high: incidents?.filter(i => i.severity === 'high').length || 0,
            critical: incidents?.filter(i => i.severity === 'critical').length || 0,
          },
          auto_detected: incidents?.filter(i => i.auto_detected).length || 0,
          avg_resolution_time: calculateAvgResolutionTime(incidents || []),
        };

        return new Response(
          JSON.stringify({ success: true, statistics: stats }),
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
    console.error('Error in incident manager:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function calculateAvgResolutionTime(incidents: any[]): number {
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' && i.resolved_at);
  
  if (resolvedIncidents.length === 0) return 0;

  const totalTime = resolvedIncidents.reduce((sum, incident) => {
    const start = new Date(incident.started_at).getTime();
    const end = new Date(incident.resolved_at).getTime();
    return sum + (end - start);
  }, 0);

  return Math.round(totalTime / resolvedIncidents.length / 60000); // Return in minutes
}
