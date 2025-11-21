import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { corsHeaders, errorResponse, successResponse } from '../_shared/error-response.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const modalApiToken = Deno.env.get('MODAL_API_TOKEN');

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

    const { model_type, schedule_type = 'weekly', auto_trigger = false } = await req.json();

    if (!model_type) {
      return errorResponse('MISSING_PARAMS', 'model_type is required', 400);
    }

    console.log(`[Schedule Retraining] Scheduling ${schedule_type} retraining for ${model_type}`);

    // Get latest model for this type
    const { data: latestModel } = await supabase
      .from('ml_model_registry')
      .select('*')
      .eq('model_type', model_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate next run time based on schedule
    const now = new Date();
    let nextRunTime = new Date();

    switch (schedule_type) {
      case 'daily':
        nextRunTime.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextRunTime.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextRunTime.setMonth(now.getMonth() + 1);
        break;
      default:
        return errorResponse('INVALID_SCHEDULE', 'Invalid schedule_type', 400);
    }

    // Create scheduled event
    const { data: event, error: eventError } = await supabase
      .from('event_log')
      .insert({
        topic: 'ml_training',
        event_type: 'scheduled_retraining',
        event_payload: {
          model_type,
          schedule_type,
          previous_model_id: latestModel?.model_id,
          auto_trigger,
        },
        status: 'pending',
        scheduled_for: nextRunTime.toISOString(),
      })
      .select()
      .single();

    if (eventError) {
      console.error('[Schedule Retraining] Error creating scheduled event:', eventError);
      return errorResponse('SCHEDULE_FAILED', 'Failed to schedule retraining', 500, eventError);
    }

    // If auto_trigger is true, trigger training now
    if (auto_trigger && modalApiToken) {
      console.log(`[Schedule Retraining] Auto-triggering immediate retraining for ${model_type}`);
      
      // Get latest training data
      const { data: files } = await supabase.storage
        .from('training-data')
        .list(model_type, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (files && files.length > 0) {
        const trainingFile = files[0];
        
        // Trigger Modal training via edge function
        await supabase.functions.invoke('modal-training-trigger', {
          body: {
            model_type,
            training_file: `${model_type}/${trainingFile.name}`,
            config: {},
          },
        });
      }
    }

    console.log(`[Schedule Retraining] Successfully scheduled ${schedule_type} retraining for ${model_type}`);

    return successResponse({
      event_id: event.id,
      model_type,
      schedule_type,
      next_run_time: nextRunTime.toISOString(),
      auto_triggered: auto_trigger,
      message: `Retraining scheduled for ${nextRunTime.toISOString()}`,
    });

  } catch (error) {
    console.error('[Schedule Retraining] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return errorResponse('INTERNAL_ERROR', errorMessage, 500);
  }
});