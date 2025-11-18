import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting service health checks...');

    // Get all services from registry
    const { data: services, error: servicesError } = await supabase
      .from('service_registry')
      .select('*');

    if (servicesError) {
      throw servicesError;
    }

    const healthChecks = await Promise.all(
      services.map(async (service) => {
        const startTime = Date.now();
        let status = 'healthy';
        let errorMessage = null;
        let responseTime = 0;

        try {
          if (service.service_type === 'edge_function' && service.endpoint) {
            // Check edge function health
            const response = await fetch(`${supabaseUrl}${service.endpoint}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ healthCheck: true }),
            });

            responseTime = Date.now() - startTime;
            
            if (!response.ok) {
              status = 'degraded';
              errorMessage = `HTTP ${response.status}`;
            }
          } else if (service.service_type === 'database') {
            // Check database health with simple query
            const { error: dbError } = await supabase
              .from('service_registry')
              .select('id')
              .limit(1);

            responseTime = Date.now() - startTime;

            if (dbError) {
              status = 'unhealthy';
              errorMessage = dbError.message;
            }
          }

          // Consider response time in health assessment
          if (responseTime > 5000) {
            status = 'degraded';
          } else if (responseTime > 10000) {
            status = 'unhealthy';
          }

        } catch (error) {
          status = 'unhealthy';
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
          responseTime = Date.now() - startTime;
        }

        // Update service status
        await supabase
          .from('service_registry')
          .update({
            status,
            last_health_check: new Date().toISOString(),
          })
          .eq('id', service.id);

        // Record health check in history
        await supabase
          .from('service_health_history')
          .insert({
            service_id: service.id,
            status,
            response_time_ms: responseTime,
            error_message: errorMessage,
            checked_at: new Date().toISOString(),
          });

        console.log(`Health check completed for ${service.service_name}: ${status} (${responseTime}ms)`);

        return {
          serviceName: service.service_name,
          status,
          responseTime,
          errorMessage,
        };
      })
    );

    const summary = {
      totalServices: services.length,
      healthy: healthChecks.filter(h => h.status === 'healthy').length,
      degraded: healthChecks.filter(h => h.status === 'degraded').length,
      unhealthy: healthChecks.filter(h => h.status === 'unhealthy').length,
      averageResponseTime: Math.round(
        healthChecks.reduce((sum, h) => sum + h.responseTime, 0) / healthChecks.length
      ),
      checks: healthChecks,
      timestamp: new Date().toISOString(),
    };

    console.log('Health check summary:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in service-health-check:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});