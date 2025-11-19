import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getExtensionCorsHeaders, handleExtensionCors, logExtensionRequest } from "../_shared/extension-cors.ts";
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from "../_shared/rate-limit-middleware.ts";

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleExtensionCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getExtensionCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit (50 requests per 15 minutes for location-based queries)
    const rateLimitResult = await checkRateLimit(user.id, 'notify-nearby-deals', {
      requests: 50,
      windowMinutes: 15,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Log request for monitoring
    logExtensionRequest(req, user.id);

    const { latitude, longitude, radiusMiles = 5 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: 'Location required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Deal Notifications] Checking deals near:', latitude, longitude);

    // Get user's favorite merchants
    const { data: favorites } = await supabase
      .from('favorite_merchants')
      .select('merchant_name, alert_on_deals')
      .eq('user_id', user.id)
      .eq('alert_on_deals', true);

    const favoriteMerchants = favorites?.map(f => f.merchant_name) || [];

    // Get active geofences with budget limits (potential deal zones)
    const { data: geofences } = await supabase
      .from('geofences')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .not('budget_limit', 'is', null);

    const deals = [];

    if (geofences && geofences.length > 0) {
      for (const geofence of geofences) {
        const distance = calculateDistance(
          latitude,
          longitude,
          geofence.center_lat,
          geofence.center_lng
        );

        // Only notify if within specified radius
        if (distance <= radiusMiles) {
          // Check if this is a favorite merchant location
          const isFavorite = favoriteMerchants.some(fav => 
            geofence.name.toLowerCase().includes(fav.toLowerCase())
          );

          // Get recent spending at this location
          const { data: recentTransactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('geofence_id', geofence.id)
            .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false })
            .limit(10);

          const avgSpending = recentTransactions && recentTransactions.length > 0
            ? recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length
            : 0;

          // Create deal notification if:
          // 1. It's a favorite merchant
          // 2. User has spent money here recently
          // 3. There's a budget limit set (indicates interest)
          if (isFavorite || avgSpending > 0 || geofence.budget_limit) {
            deals.push({
              merchantName: geofence.name,
              dealDescription: geofence.budget_limit 
                ? `Budget-friendly zone: $${geofence.budget_limit.toFixed(2)} limit`
                : 'Nearby location',
              distance: distance,
              savingsAmount: avgSpending > 0 ? avgSpending * 0.1 : undefined, // Example: 10% typical savings
              isFavorite,
              latitude: geofence.center_lat,
              longitude: geofence.center_lng,
            });
          }
        }
      }
    }

    // Sort deals by distance (closest first)
    deals.sort((a, b) => a.distance - b.distance);

    // Limit to top 5 deals
    const topDeals = deals.slice(0, 5);

    console.log('[Deal Notifications] Found', topDeals.length, 'deals');

    return new Response(JSON.stringify({ 
      ok: true,
      deals: topDeals,
      count: topDeals.length,
    }), {
      headers: { 
        ...corsHeaders, 
        ...rateLimitHeaders(rateLimitResult),
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('[Deal Notifications] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
