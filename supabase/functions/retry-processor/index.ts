import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Exponential backoff delays in seconds: [0, 300, 1800, 7200, 43200]
const RETRY_DELAYS = [0, 300, 1800, 7200, 43200]; // 0s, 5m, 30m, 2h, 12h

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Retry processor starting...');

    // Get pending items scheduled for now or earlier
    const { data: items, error: fetchError } = await supabaseClient
      .from('retry_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50); // Process 50 at a time

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${items?.length || 0} items to process`);

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    for (const item of items) {
      try {
        // Mark as processing
        await supabaseClient
          .from('retry_queue')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', item.id);

        // Process based on queue type
        const success = await processQueueItem(supabaseClient, item);

        if (success) {
          // Mark as completed
          await supabaseClient
            .from('retry_queue')
            .update({ 
              status: 'completed', 
              updated_at: new Date().toISOString() 
            })
            .eq('id', item.id);
          
          successCount++;
        } else {
          // Increment retry count and reschedule
          const newRetryCount = item.retry_count + 1;

          if (newRetryCount >= item.max_retries) {
            // Move to dead letter queue
            await supabaseClient.from('dead_letter_queue').insert({
              original_queue_type: item.queue_type,
              payload: item.payload,
              failure_reason: item.last_error || 'Max retries exceeded',
              retry_history: {
                retry_count: newRetryCount,
                last_error: item.last_error,
                original_created_at: item.created_at,
              },
            });

            // Delete from retry queue
            await supabaseClient
              .from('retry_queue')
              .delete()
              .eq('id', item.id);

            console.log(`Item ${item.id} moved to DLQ after ${newRetryCount} retries`);
          } else {
            // Schedule next retry with exponential backoff
            const delay = RETRY_DELAYS[newRetryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            const nextAttempt = new Date(Date.now() + delay * 1000);

            await supabaseClient
              .from('retry_queue')
              .update({
                status: 'pending',
                retry_count: newRetryCount,
                scheduled_for: nextAttempt.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            console.log(`Item ${item.id} rescheduled for ${nextAttempt.toISOString()} (attempt ${newRetryCount + 1})`);
          }

          failureCount++;
        }
      } catch (error: any) {
        console.error(`Error processing item ${item.id}:`, error);
        
        // Update error and mark as pending for next retry
        await supabaseClient
          .from('retry_queue')
          .update({
            status: 'pending',
            last_error: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        failureCount++;
      }
    }

    console.log(`Retry processor complete: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: items.length,
        succeeded: successCount,
        failed: failureCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Retry processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processQueueItem(supabase: any, item: any): Promise<boolean> {
  try {
    switch (item.queue_type) {
      case 'email_status_update':
        return await processEmailStatusUpdate(supabase, item.payload);
      case 'email':
        return await processEmailSend(supabase, item.payload);
      case 'push':
        return await processPushNotification(supabase, item.payload);
      default:
        console.warn(`Unknown queue type: ${item.queue_type}`);
        return false;
    }
  } catch (error: any) {
    console.error(`Error in processQueueItem for ${item.queue_type}:`, error);
    
    // Update last_error
    await supabase
      .from('retry_queue')
      .update({ last_error: error.message })
      .eq('id', item.id);

    return false;
  }
}

async function processEmailStatusUpdate(supabase: any, payload: any): Promise<boolean> {
  const { email_id, update_data } = payload;

  const { error } = await supabase
    .from('email_delivery_logs')
    .update(update_data)
    .eq('resend_message_id', email_id);

  if (error) {
    throw error;
  }

  return true;
}

async function processEmailSend(supabase: any, payload: any): Promise<boolean> {
  // Call send-email-notification function
  const { data, error } = await supabase.functions.invoke('send-email-notification', {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data.success;
}

async function processPushNotification(supabase: any, payload: any): Promise<boolean> {
  // Call send-push-notification function
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data.success;
}
