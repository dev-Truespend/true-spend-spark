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
    const { model_type, input_data, model_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get model from registry (use latest if model_id not specified)
    let modelQuery = supabase
      .from('ml_model_registry')
      .select('*')
      .eq('model_type', model_type)
      .eq('status', 'trained')
      .order('created_at', { ascending: false });

    if (model_id) {
      modelQuery = modelQuery.eq('model_id', model_id);
    }

    const { data: model, error: modelError } = await modelQuery.limit(1).single();

    if (modelError || !model) {
      return new Response(
        JSON.stringify({ error: 'No trained model found for this type' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    let prediction: any = null;
    let confidence = 0;

    // Perform inference based on model type
    // Note: For production, you'd load the actual model artifact and run inference
    // This is a simplified version that returns mock predictions
    switch (model_type) {
      case 'lambdamart_ranking': {
        // Rank offers based on features
        const offers = input_data.offers || [];
        prediction = offers.map((offer: any, idx: number) => ({
          ...offer,
          score: Math.random() * 100,
          rank: idx + 1,
        })).sort((a: any, b: any) => b.score - a.score);
        confidence = 0.85;
        break;
      }

      case 'prophet_forecast': {
        // Forecast future spending
        const horizon = input_data.horizon || 30;
        const historicalMean = input_data.historical_mean || 1000;
        prediction = Array.from({ length: horizon }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          predicted_spending: historicalMean * (1 + Math.sin(i / 7) * 0.2 + Math.random() * 0.1),
          lower_bound: historicalMean * 0.8,
          upper_bound: historicalMean * 1.2,
        }));
        confidence = 0.78;
        break;
      }

      case 'als_collab_filter': {
        // Recommend merchants
        const n_recommendations = input_data.n || 10;
        const { data: merchants } = await supabase
          .from('transactions')
          .select('merchant_name')
          .limit(50);

        prediction = (merchants || [])
          .map((m: any) => ({
            merchant_name: m.merchant_name,
            score: Math.random() * 5,
          }))
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, n_recommendations);
        confidence = 0.72;
        break;
      }

      case 'dqn_cache_policy': {
        // Recommend cache action
        const endpoint = input_data.endpoint || '';
        const cacheState = input_data.cache_state || {};
        
        prediction = {
          action: Math.random() > 0.5 ? 'cache' : 'no_cache',
          q_value: Math.random() * 10,
          expected_reward: Math.random() * 2,
        };
        confidence = 0.80;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported model type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const inferenceTime = Date.now() - startTime;

    // Log prediction
    await supabase.from('ml_predictions').insert({
      model_id: model.model_id,
      user_id: user.id,
      input_data,
      prediction,
      confidence_score: confidence,
      inference_time_ms: inferenceTime,
    });

    return new Response(
      JSON.stringify({
        model_id: model.model_id,
        model_type,
        prediction,
        confidence,
        inference_time_ms: inferenceTime,
        version: model.version,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ml-inference:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
