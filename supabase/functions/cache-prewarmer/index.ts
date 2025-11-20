import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find high-traffic geofences (>10 events in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: hotGeofences, error: geofencesError } = await supabaseClient
      .from('geofence_events')
      .select('geofence_id, geofences(center_lat, center_lng, name)')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .not('geofence_id', 'is', null);

    if (geofencesError) throw geofencesError;

    // Count events per geofence
    const eventCounts: Record<string, any> = {};
    hotGeofences?.forEach((event: any) => {
      const gid = event.geofence_id;
      if (!eventCounts[gid]) {
        eventCounts[gid] = {
          count: 0,
          lat: event.geofences?.center_lat,
          lng: event.geofences?.center_lng,
          name: event.geofences?.name,
        };
      }
      eventCounts[gid].count += 1;
    });

    // Filter geofences with >10 events
    const highTrafficGeofences = Object.entries(eventCounts)
      .filter(([_, data]: any) => data.count > 10)
      .map(([gid, data]: any) => ({ geofence_id: gid, ...data }));

    console.log(`Found ${highTrafficGeofences.length} high-traffic geofences`);

    // Pre-warm cache for each high-traffic geofence
    const MERCHANT_DISCOVERY_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/merchant-discovery`;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let succeeded = 0;
    let failed = 0;

    for (const geofence of highTrafficGeofences) {
      if (!geofence.lat || !geofence.lng) continue;

      try {
        await fetch(MERCHANT_DISCOVERY_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: geofence.lat,
            lng: geofence.lng,
            deals_only: false,
          }),
        });

        console.log(`Pre-warmed cache for geofence: ${geofence.name}`);
        succeeded++;
      } catch (error) {
        console.error(`Failed to pre-warm cache for ${geofence.name}:`, error);
        failed++;
      }
    }

    // Clean up expired cache entries
    const { error: cleanupError } = await supabaseClient
      .from('merchants_cache_v2')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (cleanupError) throw cleanupError;

    // Refresh materialized views for dashboard performance
    console.log('[cache-prewarmer] Refreshing materialized views...');
    try {
      await Promise.all([
        supabaseClient.rpc('refresh_materialized_view', { view_name: 'dashboard_summary_mv' }),
        supabaseClient.rpc('refresh_materialized_view', { view_name: 'transaction_analytics_mv' }),
        supabaseClient.rpc('refresh_materialized_view', { view_name: 'location_spending_mv' }),
      ]);
      console.log('[cache-prewarmer] Materialized views refreshed');
    } catch (error) {
      console.error('[cache-prewarmer] Failed to refresh views:', error);
    }

    console.log('[cache-prewarmer] Completed:', { processed: highTrafficGeofences.length });

    return new Response(JSON.stringify({
      success: true,
      prewarmed_geofences: highTrafficGeofences.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cache-prewarmer:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
