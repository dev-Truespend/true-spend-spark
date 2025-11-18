import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchConfig {
  size: number;
  window: number; // milliseconds
}

interface BatchMetrics {
  batch_size: number;
  processing_time_ms: number;
  throughput_eps: number; // events per second
  timestamp: string;
  event_rate: number;
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

    console.log('[Batch Processor] Starting adaptive batch processing...');

    const startTime = performance.now();

    // Calculate current event rate (events per second in last minute)
    const { data: recentEvents, error: rateError } = await supabaseClient
      .from('event_log')
      .select('id, created_at', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString());

    if (rateError) {
      console.error('[Batch Processor] Error calculating event rate:', rateError);
      throw rateError;
    }

    const eventRate = (recentEvents?.length || 0) / 60; // events per second
    console.log(`[Batch Processor] Current event rate: ${eventRate.toFixed(2)} events/sec`);

    // Calculate adaptive batch size based on load
    const batchConfig = calculateBatchSize(eventRate);
    console.log(`[Batch Processor] Batch config:`, batchConfig);

    // Fetch pending events with dynamic batch size
    const { data: pendingEvents, error: fetchError } = await supabaseClient
      .from('event_log')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(batchConfig.size);

    if (fetchError) {
      console.error('[Batch Processor] Error fetching events:', fetchError);
      throw fetchError;
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      console.log('[Batch Processor] No pending events to process');
      
      return new Response(
        JSON.stringify({ 
          success: true,
          processed: 0,
          event_rate: eventRate,
          batch_config: batchConfig,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Batch Processor] Processing ${pendingEvents.length} events`);

    // Process events in batch
    const batchProcessingStart = performance.now();
    const eventIds = pendingEvents.map(e => e.id);

    // Mark all as processing
    const { error: updateError } = await supabaseClient
      .from('event_log')
      .update({ status: 'processing' })
      .in('id', eventIds);

    if (updateError) {
      console.error('[Batch Processor] Error updating event status:', updateError);
      throw updateError;
    }

    // Process each event
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
    };

    for (const event of pendingEvents) {
      try {
        // Simulate event processing (in real implementation, this would route to handlers)
        await processEvent(supabaseClient, event);

        // Mark as delivered
        await supabaseClient
          .from('event_log')
          .update({ 
            status: 'delivered',
            processed_at: new Date().toISOString()
          })
          .eq('id', event.id);

        results.succeeded++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Batch Processor] Error processing event ${event.id}:`, error);

        // Update with error
        await supabaseClient
          .from('event_log')
          .update({
            status: 'pending',
            retry_count: event.retry_count + 1,
            error_message: errorMessage,
          })
          .eq('id', event.id);

        results.failed++;
      }

      results.processed++;
    }

    const batchProcessingTime = performance.now() - batchProcessingStart;
    const totalProcessingTime = performance.now() - startTime;
    const throughput = results.processed / (totalProcessingTime / 1000);

    console.log(`[Batch Processor] Completed:`, {
      ...results,
      processing_time: `${batchProcessingTime.toFixed(2)}ms`,
      throughput: `${throughput.toFixed(2)} events/sec`,
    });

    // Record batch metrics
    const metrics: BatchMetrics = {
      batch_size: results.processed,
      processing_time_ms: Math.round(batchProcessingTime),
      throughput_eps: Math.round(throughput * 100) / 100,
      timestamp: new Date().toISOString(),
      event_rate: Math.round(eventRate * 100) / 100,
    };

    // Store metrics for monitoring (optional - could be stored in separate table)
    console.log('[Batch Processor] Metrics:', metrics);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...results,
        metrics,
        batch_config: batchConfig,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Batch Processor] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Batch processor failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Calculate dynamic batch size based on current event rate
 * Blueprint v4.2 adaptive batching algorithm
 */
function calculateBatchSize(eventRate: number): BatchConfig {
  if (eventRate < 10) {
    // Low traffic: Small batches, frequent processing
    return { size: 10, window: 100 };
  } else if (eventRate < 50) {
    // Medium traffic: Medium batches
    return { size: 50, window: 500 };
  } else if (eventRate < 100) {
    // High traffic: Large batches
    return { size: 100, window: 1000 };
  } else {
    // Very high traffic: Maximum batch size
    return { size: 200, window: 2000 };
  }
}

/**
 * Process an individual event (placeholder - actual implementation in event-consumer)
 */
async function processEvent(supabase: any, event: any): Promise<void> {
  // In production, this would delegate to event-consumer logic
  // For now, just mark as processed
  console.log(`[Batch Processor] Processing event ${event.id} (${event.event_type})`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 10));
}
