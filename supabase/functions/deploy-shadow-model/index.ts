import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { corsHeaders, errorResponse, successResponse } from '../_shared/error-response.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('AUTH_REQUIRED', 'Authorization header required', 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return errorResponse('AUTH_FAILED', 'Invalid authentication', 401);
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return errorResponse('FORBIDDEN', 'Admin access required', 403);
    }

    const { model_id, traffic_split = 5 } = await req.json();

    if (!model_id) {
      return errorResponse('MISSING_PARAMS', 'model_id is required', 400);
    }

    console.log(`[Shadow Deploy] Deploying model ${model_id} with ${traffic_split}% traffic`);

    // Get model from registry
    const { data: model, error: modelError } = await supabase
      .from('ml_model_registry')
      .select('*')
      .eq('model_id', model_id)
      .single();

    if (modelError || !model) {
      return errorResponse('MODEL_NOT_FOUND', 'Model not found in registry', 404);
    }

    // Update model registry with shadow deployment status
    const { error: updateError } = await supabase
      .from('ml_model_registry')
      .update({
        shadow_deployed: true,
        shadow_traffic_split: traffic_split,
        shadow_deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('model_id', model_id);

    if (updateError) {
      console.error('[Shadow Deploy] Error updating model:', updateError);
      return errorResponse('UPDATE_FAILED', 'Failed to update model status', 500, updateError);
    }

    // Create A/B test for shadow vs production
    const { data: abTest, error: abError } = await supabase
      .from('ml_ab_tests')
      .insert({
        test_name: `Shadow Deploy: ${model.model_type} v${model.version}`,
        model_a_id: 'production',
        model_b_id: model_id,
        traffic_split: traffic_split / 100,
        status: 'running',
        metrics: {
          shadow_traffic_split: traffic_split,
          deployment_type: 'shadow',
        },
      })
      .select()
      .single();

    if (abError) {
      console.error('[Shadow Deploy] Error creating A/B test:', abError);
    }

    // Log event
    await supabase.from('event_log').insert({
      topic: 'ml_training',
      event_type: 'shadow_deployment',
      event_payload: {
        model_id,
        traffic_split,
        ab_test_id: abTest?.id,
      },
      status: 'completed',
    });

    console.log(`[Shadow Deploy] Successfully deployed model ${model_id} to shadow`);

    return successResponse({
      model_id,
      traffic_split,
      ab_test_id: abTest?.id,
      message: `Model deployed to shadow with ${traffic_split}% traffic`,
    });

  } catch (error) {
    console.error('[Shadow Deploy] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return errorResponse('INTERNAL_ERROR', errorMessage, 500);
  }
});