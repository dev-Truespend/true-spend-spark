// OCR Queue Processor - Batch processing with priority
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withRetry, VISION_RETRY_CONFIG } from '../_shared/retry-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  id: string;
  user_id: string;
  image_url: string;
  priority: number;
  retry_count: number;
  max_retries: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 10 } = await req.json().catch(() => ({}));

    console.log(`[Queue Processor] Processing batch of ${batchSize} items...`);

    // Get pending items sorted by priority and creation time
    const { data: queueItems, error: fetchError } = await supabase
      .from('ocr_processing_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch queue items: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('[Queue Processor] No pending items in queue');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Queue Processor] Found ${queueItems.length} pending items`);
    
    const results = {
      successful: 0,
      failed: 0,
      total: queueItems.length,
    };

    // Process items concurrently with a limit
    const concurrencyLimit = 5;
    for (let i = 0; i < queueItems.length; i += concurrencyLimit) {
      const batch = queueItems.slice(i, i + concurrencyLimit);
      
      await Promise.all(
        batch.map(item => processQueueItem(supabase, item, results))
      );
    }

    console.log('[Queue Processor] Batch complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Queue Processor] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Process a single queue item
 */
async function processQueueItem(
  supabase: any,
  item: QueueItem,
  results: { successful: number; failed: number; total: number }
): Promise<void> {
  const startTime = Date.now();
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    console.log(`[Queue] Processing item ${item.id} (priority: ${item.priority})`);

    // Update status to processing
    await supabase
      .from('ocr_processing_queue')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    // Call Google Vision OCR with retry logic
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke('google-vision-ocr', {
          body: { imageUrl: item.image_url },
          headers: {
            authorization: `Bearer ${supabaseServiceKey}`,
          },
        });

        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || 'OCR failed');

        return data;
      },
      VISION_RETRY_CONFIG
    );

    if (!result.success) {
      throw new Error(result.error || 'OCR processing failed');
    }

    // Update queue item with successful result
    const processingTime = Date.now() - startTime;
    await supabase
      .from('ocr_processing_queue')
      .update({
        status: 'completed',
        result: result.data,
        estimated_cost_usd: result.data?.meta?.costUsd || 0.0015,
        processing_completed_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    results.successful++;
    console.log(`[Queue] Item ${item.id} completed in ${processingTime}ms`);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`[Queue] Item ${item.id} failed after ${processingTime}ms:`, errorMessage);

    // Check if we should retry
    if (item.retry_count < item.max_retries) {
      await supabase
        .from('ocr_processing_queue')
        .update({
          status: 'pending',
          retry_count: item.retry_count + 1,
          error_message: errorMessage,
        })
        .eq('id', item.id);
      
      console.log(`[Queue] Item ${item.id} queued for retry (${item.retry_count + 1}/${item.max_retries})`);
    } else {
      // Max retries reached - mark as failed
      await supabase
        .from('ocr_processing_queue')
        .update({
          status: 'failed',
          error_message: `Max retries exceeded: ${errorMessage}`,
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      
      results.failed++;
      console.log(`[Queue] Item ${item.id} permanently failed after ${item.max_retries} retries`);
    }
  }
}
