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

    // Log cache hit/miss
    await supabaseClient.from('cache_analytics').insert({
      cache_type: 'merchant_discovery',
      hit_count: cachedMerchants && cachedMerchants.length > 0 ? 1 : 0,
      miss_count: cachedMerchants && cachedMerchants.length > 0 ? 0 : 1,
    });

    // If cache hit, record recommendations
    if (cachedMerchants && cachedMerchants.length > 0) {
      const recommendations = cachedMerchants.slice(0, 5).map(m => ({
        user_id: user.id,
        merchant_id: m.merchant_id,
        recommendation_reason: deals_only ? 'deal_available' : 'proximity_match',
        score: m.popularity_score || 0,
      }));

      await supabaseClient.from('merchant_recommendations').insert(recommendations);

      return new Response(JSON.stringify({ 
        merchants: cachedMerchants, 
        cache_hit: true 
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

    // Cache results
    const merchantsToCache = placesData.results?.slice(0, 20).map((place: any) => ({
      geohash: encodeGeohash(place.geometry.location.lat, place.geometry.location.lng),
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      name: place.name,
      category: place.types?.[0],
      popularity_score: place.rating || 0,
      deal_available: false,
      cashback_rate: 0,
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
