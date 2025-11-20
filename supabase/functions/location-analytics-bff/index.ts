import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Redis client for L1 cache
async function redisGet(key: string): Promise<any> {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: any, ttl: number): Promise<void> {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return;

  try {
    await fetch(`${url}/setex/${key}/${ttl}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(value),
    });
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { period_days = 30, geofence_id } = await req.json();
    const periodStart = new Date(Date.now() - period_days * 24 * 60 * 60 * 1000);

    // Check Redis L1 cache
    const cacheKey = `location_analytics:${user.id}:${period_days}:${geofence_id || 'all'}`;
    const cachedAnalytics = await redisGet(cacheKey);

    if (cachedAnalytics) {
      console.log(`Redis L1 cache hit for ${cacheKey}`);
      return new Response(JSON.stringify({
        ...cachedAnalytics,
        cache_hit: true,
        cache_layer: 'L1_Redis',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aggregate spending by geofence
    const { data: analytics, error: analyticsError } = await supabaseClient
      .from('transactions')
      .select('geofence_id, amount, category, geofences(name, type, center_lat, center_lng)')
      .eq('user_id', user.id)
      .gte('timestamp', periodStart.toISOString())
      .not('geofence_id', 'is', null);

    if (analyticsError) throw analyticsError;

    // Group by geofence
    const aggregated = analytics?.reduce((acc: any, tx: any) => {
      const gid = tx.geofence_id;
      if (!acc[gid]) {
        acc[gid] = {
          geofence_id: gid,
          geofence_name: tx.geofences?.name,
          geofence_type: tx.geofences?.type,
          lat: tx.geofences?.center_lat,
          lng: tx.geofences?.center_lng,
          total_spent: 0,
          transaction_count: 0,
          categories: {},
        };
      }
      acc[gid].total_spent += parseFloat(tx.amount);
      acc[gid].transaction_count += 1;
      acc[gid].categories[tx.category] = (acc[gid].categories[tx.category] || 0) + 1;
      return acc;
    }, {});

    const geofenceAnalytics = Object.values(aggregated || {});

    // Fetch heatmap data
    const { data: heatmapData, error: heatmapError } = await supabaseClient
      .from('geofence_heatmap_data')
      .select('*')
      .eq('user_id', user.id)
      .order('intensity', { ascending: false })
      .limit(100);

    if (heatmapError) throw heatmapError;

    // Fetch insights
    const { data: insights, error: insightsError } = await supabaseClient
      .from('location_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (insightsError) throw insightsError;

    // Fetch recommendations
    const { data: recommendations, error: recsError } = await supabaseClient
      .from('location_recommendations')
      .select('*, geofences(name)')
      .eq('user_id', user.id)
      .eq('accepted', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recsError) throw recsError;

    const responseData = {
      analytics: geofenceAnalytics,
      heatmap: heatmapData,
      insights,
      recommendations,
      period_days,
      cache_hit: false,
      cache_layer: 'L3_Database',
    };

    // Store in Redis L1 cache (10 min TTL for analytics)
    await redisSet(cacheKey, responseData, 600);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in location-analytics-bff:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
