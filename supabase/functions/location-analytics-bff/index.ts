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
      .order('spending_intensity', { ascending: false })
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

    return new Response(JSON.stringify({
      analytics: geofenceAnalytics,
      heatmap: heatmapData,
      insights,
      recommendations,
      period_days,
    }), {
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
