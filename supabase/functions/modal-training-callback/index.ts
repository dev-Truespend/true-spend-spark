import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-modal-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model_id, artifact_url, metrics, modal_job_id, status } = await req.json();

    // Verify webhook signature (optional but recommended)
    const signature = req.headers.get('x-modal-signature');
    const webhookSecret = Deno.env.get('MODAL_WEBHOOK_SECRET');
    
    if (webhookSecret && signature) {
      // Implement signature verification here
      // For now, we'll log it
      console.log('Received webhook with signature:', signature);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update training job status
    const { error: jobUpdateError } = await supabase
      .from('ml_training_jobs')
      .update({
        status: status || 'completed',
        completed_at: new Date().toISOString(),
        resulting_model_id: model_id,
      })
      .eq('modal_job_id', modal_job_id);

    if (jobUpdateError) {
      console.error('Error updating training job:', jobUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update job status', details: jobUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Register model in model registry
    const { data: modelData, error: modelError } = await supabase
      .from('ml_model_registry')
      .insert({
        model_id,
        model_type: model_id.split('_')[0], // Extract type from model_id
        version: '1.0.0',
        artifact_url,
        status: 'trained',
        metrics,
        trained_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (modelError) {
      console.error('Error registering model:', modelError);
      return new Response(
        JSON.stringify({ error: 'Failed to register model', details: modelError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Model registered:', modelData.model_id);

    // Check if we should trigger shadow deployment
    const autoDeployFlag = Deno.env.get('ML_AUTO_DEPLOY_SHADOW');
    if (autoDeployFlag === 'true') {
      console.log('Triggering shadow deployment for:', model_id);
      
      // Invoke shadow deployment function (to be created in Phase 14)
      const { error: deployError } = await supabase.functions.invoke('deploy-shadow-model', {
        body: { model_id, artifact_url },
      });

      if (deployError) {
        console.error('Error triggering shadow deployment:', deployError);
        // Don't fail the callback - just log the error
      }
    }

    // Log event for monitoring
    await supabase.from('event_log').insert({
      topic: 'ml_training',
      event_type: 'model_trained',
      event_payload: {
        model_id,
        modal_job_id,
        metrics,
      },
      metadata: {
        artifact_url,
        trained_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        status: 'registered',
        model_id,
        message: 'Model registered successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in modal-training-callback:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});