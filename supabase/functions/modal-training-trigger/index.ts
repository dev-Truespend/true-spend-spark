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
    const { model_type, training_data_id, config } = await req.json();

    // Validate model type
    const validTypes = ['dqn_cache', 'lstm_anomaly', 'distilbert_classifier', 'als_recommender'];
    if (!validTypes.includes(model_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid model type', valid_types: validTypes }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate signed URL for training data (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('training-data')
      .createSignedUrl(`${training_data_id}.json`, 3600);

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to create training data URL', details: signedUrlError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Modal API token
    const MODAL_TOKEN = Deno.env.get('MODAL_API_TOKEN');
    if (!MODAL_TOKEN) {
      console.error('MODAL_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Modal integration not configured. Please add MODAL_API_TOKEN secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map model types to Modal function URLs
    const modalFunctions: Record<string, string> = {
      'dqn_cache': 'train-dqn-cache-policy',
      'lstm_anomaly': 'train-lstm-anomaly-detector',
      'distilbert_classifier': 'train-distilbert-classifier',
      'als_recommender': 'train-als-recommender',
    };

    // Trigger Modal training job
    const modalFunctionName = modalFunctions[model_type];
    const modalUrl = `https://truespend--${modalFunctionName}.modal.run`;

    console.log(`Triggering Modal job: ${modalUrl}`);
    
    const modalResponse = await fetch(modalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MODAL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        training_data_url: signedUrlData.signedUrl,
        callback_url: `${supabaseUrl}/functions/v1/modal-training-callback`,
        config: config || {},
      }),
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      console.error('Modal API error:', modalResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to trigger Modal job', details: errorText }),
        { status: modalResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modalData = await modalResponse.json();

    // Store training job in database
    const { data: jobData, error: jobError } = await supabase
      .from('ml_training_jobs')
      .insert({
        model_type,
        modal_job_id: modalData.job_id || modalData.id,
        training_data_id,
        status: 'running',
        started_at: new Date().toISOString(),
        created_by: req.headers.get('x-user-id') || null,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error storing training job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to store job record', details: jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Training job created:', jobData.id);

    return new Response(
      JSON.stringify({
        job_id: jobData.id,
        modal_job_id: modalData.job_id || modalData.id,
        model_type,
        status: 'running',
        message: 'Training job triggered successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in modal-training-trigger:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});