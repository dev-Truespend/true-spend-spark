import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geohash encoding function (precision 7 = ~153m)
function encodeGeohash(lat: number, lng: number, precision = 7): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let geohash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const lngMid = (lngMin + lngMax) / 2;
      if (lng > lngMid) {
        ch |= (1 << (4 - bit));
        lngMin = lngMid;
      } else {
        lngMax = lngMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat > latMid) {
        ch |= (1 << (4 - bit));
        latMin = latMid;
      } else {
        latMax = latMid;
      }
    }
    isEven = !isEven;

    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
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

    const { lat, lng, category, deals_only } = await req.json();

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'Missing lat/lng' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geohash = encodeGeohash(lat, lng);
    const geohashPrefix = geohash.substring(0, 5); // Expand search radius

    // Query cache with geohash indexing
    let query = supabaseClient
      .from('merchants_cache_v2')
      .select('*')
      .like('geohash', `${geohashPrefix}%`)
      .gt('expires_at', new Date().toISOString())
      .order('popularity_score', { ascending: false })
      .limit(20);

    if (category) {
      query = query.eq('category', category);
    }

    if (deals_only) {
      query = query.eq('deal_available', true);
    }

    const { data: cachedMerchants, error: cacheError } = await query;

    if (cacheError) throw cacheError;

    // Log cache hit/miss with enhanced metrics
    const cacheHit = cachedMerchants && cachedMerchants.length > 0;
    await supabaseClient.from('cache_analytics').insert({
      cache_type: 'merchant_discovery',
      operation: cacheHit ? 'hit' : 'miss',
      geohash: geohashPrefix,
      response_time_ms: Date.now() - Date.now(), // Will be updated below
      saved_api_cost_usd: cacheHit ? 0.002 : 0, // Google Places API cost per request
      metadata: {
        category: category || 'all',
        deals_only: deals_only || false,
        results_count: cachedMerchants?.length || 0,
      },
    });

    // If cache hit, update access tracking and record recommendations
    if (cachedMerchants && cachedMerchants.length > 0) {
      // Update hit count and last accessed timestamp for LRU
      const cacheIds = cachedMerchants.map(m => m.id);
      await supabaseClient
        .from('merchants_cache_v2')
        .update({ 
          last_accessed: new Date().toISOString(),
        })
        .in('id', cacheIds)
        .select()
        .then(({ data }) => {
          if (data) {
            data.forEach(async (item) => {
              await supabaseClient.rpc('increment_cache_hit', { cache_id: item.id });
            });
          }
        });

      // Create contextual recommendations with enhanced scoring
      const recommendations = cachedMerchants.slice(0, 5).map((m, index) => {
        let confidence = 0.8 - (index * 0.1); // Decay confidence by ranking
        let reason = 'proximity_match';
        
        if (deals_only && m.merchant_data?.deal_available) {
          confidence += 0.15;
          reason = 'deal_available';
        }
        
        if (m.rating && m.rating > 4.0) {
          confidence += 0.05;
        }

        return {
          user_id: user.id,
          merchant_id: m.merchant_data?.merchant_id || m.id,
          recommendation_reason: reason,
          confidence_score: Math.min(confidence, 1.0),
          geofence_id: null,
          deal_type: m.merchant_data?.deal_type || null,
          deal_description: m.merchant_data?.deal_description || null,
          potential_savings: m.merchant_data?.potential_savings || null,
        };
      });

      await supabaseClient.from('merchant_recommendations').insert(recommendations);

      return new Response(JSON.stringify({ 
        merchants: cachedMerchants, 
        cache_hit: true,
        recommendations_generated: recommendations.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache miss: Fetch from Google Places (fallback)
    const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY');
    if (!GOOGLE_MAPS_KEY) {
      return new Response(JSON.stringify({ merchants: [], cache_hit: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&type=restaurant&key=${GOOGLE_MAPS_KEY}`;
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();

    // Cache results with TTL and versioning
    const cacheVersion = '2.0';
    const ttlHours = 24; // Cache for 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const merchantsToCache = placesData.results?.slice(0, 20).map((place: any) => ({
      geohash: encodeGeohash(place.geometry.location.lat, place.geometry.location.lng),
      geohash_precision: 7,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      categories: place.types || [],
      rating: place.rating || null,
      price_tier: place.price_level || null,
      source: 'google_places',
      expires_at: expiresAt.toISOString(),
      merchant_data: {
        merchant_id: place.place_id,
        name: place.name,
        category: place.types?.[0],
        popularity_score: place.rating || 0,
        deal_available: false,
        cashback_rate: 0,
        address: place.vicinity,
        cache_version: cacheVersion,
      },
    })) || [];

    if (merchantsToCache.length > 0) {
      await supabaseClient.from('merchants_cache_v2').insert(merchantsToCache);
    }

    return new Response(JSON.stringify({ 
      merchants: merchantsToCache, 
      cache_hit: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in merchant-discovery:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
