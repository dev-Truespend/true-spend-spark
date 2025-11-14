import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🧹 Starting Foursquare cache cleanup...');

    // Call the database function to cleanup expired cache
    const { data: cacheResult, error: cacheError } = await supabase
      .rpc('cleanup_expired_foursquare_cache');

    if (cacheError) {
      console.error('Cache cleanup error:', cacheError);
      throw cacheError;
    }

    const deletedCacheCount = cacheResult || 0;
    console.log(`✅ Deleted ${deletedCacheCount} expired cache entries`);

    // Call the database function to cleanup old logs (90+ days)
    const { data: logsResult, error: logsError } = await supabase
      .rpc('cleanup_old_foursquare_logs');

    if (logsError) {
      console.error('Logs cleanup error:', logsError);
      throw logsError;
    }

    const deletedLogsCount = logsResult || 0;
    console.log(`✅ Deleted ${deletedLogsCount} old log entries`);

    // Get cache statistics
    const { count: totalCached } = await supabase
      .from('place_enrichment_cache')
      .select('*', { count: 'exact', head: true });

    const { data: cacheStats } = await supabase
      .from('place_enrichment_cache')
      .select('enrichment_type, hit_count')
      .order('hit_count', { ascending: false })
      .limit(10);

    console.log('📊 Cache Statistics:', {
      total_entries: totalCached,
      deleted_expired: deletedCacheCount,
      deleted_logs: deletedLogsCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        cache_cleaned: deletedCacheCount,
        logs_cleaned: deletedLogsCount,
        total_cached: totalCached,
        execution_time_ms: Date.now() - startTime,
        top_cached: cacheStats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in foursquare-cache-cleanup:', error);

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
