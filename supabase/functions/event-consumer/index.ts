import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventLogEntry {
  id: string;
  event_type: string;
  event_payload: Record<string, any>;
  topic: string;
  user_id: string;
  retry_count: number;
  max_retries: number;
  scheduled_for: string;
  metadata: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const batchSize = 50; // Process up to 50 events per run
    const now = new Date().toISOString();

    console.log('Event consumer started, fetching pending events...');

    // Fetch pending events that are ready to be processed
    const { data: events, error: fetchError } = await supabaseClient
      .from('event_log')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error('Error fetching events:', fetchError);
      throw fetchError;
    }

    if (!events || events.length === 0) {
      console.log('No pending events to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0,
          message: 'No events to process'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${events.length} events to process`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      moved_to_dlq: 0,
    };

    // Process each event
    for (const event of events) {
      try {
        // Mark as processing
        await supabaseClient
          .from('event_log')
          .update({ status: 'processing' })
          .eq('id', event.id);

        console.log(`Processing event ${event.id} (${event.event_type})`);

        // Process the event based on its type
        const success = await processEvent(supabaseClient, event as EventLogEntry);

        if (success) {
          // Mark as delivered
          await supabaseClient
            .from('event_log')
            .update({ 
              status: 'delivered',
              processed_at: new Date().toISOString()
            })
            .eq('id', event.id);

          results.succeeded++;
          console.log(`✅ Event ${event.id} processed successfully`);
        } else {
          throw new Error('Event processing returned false');
        }

        results.processed++;
      } catch (error) {
        console.error(`❌ Error processing event ${event.id}:`, error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        const newRetryCount = event.retry_count + 1;

        if (newRetryCount >= event.max_retries) {
          // Move to dead letter queue
          console.log(`Moving event ${event.id} to dead letter queue (max retries exceeded)`);

          const { error: dlqError } = await supabaseClient
            .from('dead_letter_queue')
            .insert({
              original_queue_type: 'event_log',
              payload: {
                event_id: event.id,
                event_type: event.event_type,
                event_payload: event.event_payload,
                topic: event.topic,
                user_id: event.user_id,
              },
              failure_reason: `Failed after ${event.max_retries} retries: ${errorMessage}`,
              retry_history: {
                attempts: newRetryCount,
                last_error: errorMessage,
                last_attempt: new Date().toISOString(),
              },
              manual_review_required: true,
            });

          if (dlqError) {
            console.error('Error moving to DLQ:', dlqError);
          }

          // Mark as failed
          await supabaseClient
            .from('event_log')
            .update({ 
              status: 'failed',
              error_message: `Max retries exceeded: ${errorMessage}`,
              processed_at: new Date().toISOString()
            })
            .eq('id', event.id);

          results.moved_to_dlq++;
        } else {
          // Schedule for retry with exponential backoff
          const backoffSeconds = Math.pow(2, newRetryCount) * 30; // 30s, 60s, 120s...
          const nextRetry = new Date(Date.now() + backoffSeconds * 1000).toISOString();

          await supabaseClient
            .from('event_log')
            .update({ 
              status: 'pending',
              retry_count: newRetryCount,
              scheduled_for: nextRetry,
              error_message: errorMessage,
            })
            .eq('id', event.id);

          console.log(`Event ${event.id} scheduled for retry at ${nextRetry}`);
        }

        results.failed++;
        results.processed++;
      }
    }

    console.log('Event consumer finished:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in event-consumer function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Event consumer failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Process an event based on its type
 * This is where you'd add custom logic for different event types
 */
async function processEvent(
  supabase: any,
  event: EventLogEntry
): Promise<boolean> {
  console.log(`Processing event type: ${event.event_type}`);

  try {
    // Route to appropriate handler based on event type
    const [domain, action] = event.event_type.split('.');

    switch (domain) {
      case 'transaction':
        return await processTransactionEvent(supabase, action, event);
      
      case 'budget':
        return await processBudgetEvent(supabase, action, event);
      
      case 'geofence':
        return await processGeofenceEvent(supabase, action, event);
      
      case 'notification':
        return await processNotificationEvent(supabase, action, event);
      
      default:
        console.log(`Unknown event domain: ${domain}, marking as delivered`);
        return true;
    }
  } catch (error) {
    console.error('Error in processEvent:', error);
    throw error;
  }
}

async function processTransactionEvent(
  supabase: any,
  action: string,
  event: EventLogEntry
): Promise<boolean> {
  console.log(`Processing transaction.${action} event`);
  
  // Example: Trigger notifications, update analytics, etc.
  if (action === 'created') {
    // Could trigger notification to user
    console.log('Transaction created:', event.event_payload);
  }
  
  return true;
}

async function processBudgetEvent(
  supabase: any,
  action: string,
  event: EventLogEntry
): Promise<boolean> {
  console.log(`Processing budget.${action} event`);
  
  if (action === 'exceeded') {
    // Could send alert to user
    console.log('Budget exceeded:', event.event_payload);
  }
  
  return true;
}

async function processGeofenceEvent(
  supabase: any,
  action: string,
  event: EventLogEntry
): Promise<boolean> {
  console.log(`Processing geofence.${action} event`);
  
  if (action === 'entered') {
    // Could trigger merchant discovery
    console.log('Geofence entered:', event.event_payload);
  }
  
  return true;
}

async function processNotificationEvent(
  supabase: any,
  action: string,
  event: EventLogEntry
): Promise<boolean> {
  console.log(`Processing notification.${action} event`);
  
  // Route to notification system
  return true;
}
