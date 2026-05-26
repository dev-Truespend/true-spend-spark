import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LRU Cache Eviction Policy
 * - Removes expired cache entries
 * - Evicts least-recently-used entries when cache size exceeds threshold
 * - Maintains cache analytics for monitoring
 */

const CACHE_SIZE_THRESHOLD = 10000; // Max cache entries
const RETENTION_DAYS = 30; // Keep entries for 30 days max
const LRU_BATCH_SIZE = 500; // Evict in batches

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('[Cache Eviction] Starting LRU eviction policy...');

    // Step 1: Remove expired entries
    const { data: expiredData, error: expiredError } = await supabase
      .from('merchants_cache_v2')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (expiredError) throw expiredError;
    const expiredCount = expiredData?.length || 0;
    console.log(`✅ Removed ${expiredCount} expired cache entries`);

    // Step 2: Remove old entries beyond retention period
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);

    const { data: oldData, error: oldError } = await supabase
      .from('merchants_cache_v2')
      .delete()
      .lt('cached_at', retentionDate.toISOString())
      .select('id');

    if (oldError) throw oldError;
    const oldCount = oldData?.length || 0;
    console.log(`✅ Removed ${oldCount} entries beyond ${RETENTION_DAYS} days retention`);

    // Step 3: Check total cache size
    const { count: totalCount, error: countError } = await supabase
      .from('merchants_cache_v2')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`📊 Current cache size: ${totalCount} entries`);

    let lruEvicted = 0;
    if (totalCount && totalCount > CACHE_SIZE_THRESHOLD) {
      // Step 4: LRU eviction - remove least recently accessed
      const excessCount = totalCount - CACHE_SIZE_THRESHOLD;
      const evictionTarget = Math.min(excessCount + LRU_BATCH_SIZE, totalCount);

      const { data: lruData, error: lruError } = await supabase
        .from('merchants_cache_v2')
        .select('id')
        .order('last_accessed', { ascending: true, nullsFirst: true })
        .order('hit_count', { ascending: true, nullsFirst: true })
        .limit(evictionTarget);

      if (lruError) throw lruError;

      if (lruData && lruData.length > 0) {
        const idsToEvict = lruData.map(entry => entry.id);
        const { error: deleteError } = await supabase
          .from('merchants_cache_v2')
          .delete()
          .in('id', idsToEvict);

        if (deleteError) throw deleteError;
        lruEvicted = idsToEvict.length;
        console.log(`✅ LRU evicted ${lruEvicted} entries to maintain threshold`);
      }
    }

    // Step 5: Record cache analytics
    await supabase.from('cache_analytics').insert({
      cache_type: 'lru_eviction',
      operation: 'cleanup',
      response_time_ms: Date.now() - startTime,
      metadata: {
        expired_removed: expiredCount,
        old_removed: oldCount,
        lru_evicted: lruEvicted,
        total_removed: expiredCount + oldCount + lruEvicted,
        cache_size_after: (totalCount || 0) - (expiredCount + oldCount + lruEvicted),
        threshold: CACHE_SIZE_THRESHOLD,
      },
    });

    const summary = {
      success: true,
      expired_removed: expiredCount,
      old_removed: oldCount,
      lru_evicted: lruEvicted,
      total_removed: expiredCount + oldCount + lruEvicted,
      cache_size_after: (totalCount || 0) - (expiredCount + oldCount + lruEvicted),
      execution_time_ms: Date.now() - startTime,
    };

    console.log('✅ Cache eviction complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Cache eviction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
