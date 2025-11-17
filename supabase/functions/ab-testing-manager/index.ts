import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, experiment_id, metric_name, metric_value } = await req.json();

    if (action === 'assign') {
      // Check if user already assigned
      const { data: existing } = await supabaseClient
        .from('user_experiment_assignments')
        .select('*')
        .eq('user_id', user.id)
        .eq('experiment_id', experiment_id)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ variant: existing.variant }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch experiment details
      const { data: experiment, error: expError } = await supabaseClient
        .from('ab_experiments')
        .select('*')
        .eq('experiment_id', experiment_id)
        .eq('active', true)
        .single();

      if (expError || !experiment) {
        return new Response(JSON.stringify({ error: 'Experiment not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Randomly assign variant
      const variants = experiment.variants as string[];
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];

      const { error: assignError } = await supabaseClient
        .from('user_experiment_assignments')
        .insert({
          user_id: user.id,
          experiment_id,
          variant: randomVariant,
        });

      if (assignError) throw assignError;

      return new Response(JSON.stringify({ variant: randomVariant }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'track_metric') {
      // Get user's variant
      const { data: assignment } = await supabaseClient
        .from('user_experiment_assignments')
        .select('variant')
        .eq('user_id', user.id)
        .eq('experiment_id', experiment_id)
        .single();

      if (!assignment) {
        return new Response(JSON.stringify({ error: 'User not assigned to experiment' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Record metric
      const { error: metricError } = await supabaseClient
        .from('experiment_metrics')
        .insert({
          experiment_id,
          variant: assignment.variant,
          metric_name,
          metric_value,
        });

      if (metricError) throw metricError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ab-testing-manager:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
