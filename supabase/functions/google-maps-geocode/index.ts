import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  address?: string;
  lat?: number;
  lng?: number;
  components?: {
    country?: string;
    postal_code?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleMapsKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: GeocodeRequest = await req.json();
    const { address, lat, lng, components } = body;

    // Validate input
    if (!address && (!lat || !lng)) {
      return new Response(
        JSON.stringify({ error: 'Either address or lat/lng coordinates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate cache key
    const cacheInput = address || `${lat},${lng}`;
    const encoder = new TextEncoder();
    const hashData = encoder.encode(cacheInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const queryHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('🔍 Geocode request:', { address, lat, lng, queryHash });

    // Check cache first
    const { data: cachedData } = await supabase
      .from('google_maps_geocode_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('✅ Cache HIT:', queryHash);
      
      // Increment hit count
      await supabase
        .from('google_maps_geocode_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('query_hash', queryHash);

      // Log cache hit
      await supabase.from('google_maps_api_logs').insert({
        api_type: 'geocoding',
        endpoint: 'google-maps-geocode',
        request_params: { address, lat, lng },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
        cost_usd: 0,
      });

      return new Response(
        JSON.stringify({
          lat: cachedData.lat,
          lng: cachedData.lng,
          formatted_address: cachedData.formatted_address,
          place_id: cachedData.place_id,
          address_components: cachedData.components,
          cache_hit: true,
          response_time_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('❌ Cache MISS - calling Google Maps API');

    // Build Google API URL
    let googleUrl = 'https://maps.googleapis.com/maps/api/geocode/json?';
    if (address) {
      googleUrl += `address=${encodeURIComponent(address)}`;
      if (components?.country) {
        googleUrl += `&components=country:${components.country}`;
      }
      if (components?.postal_code) {
        googleUrl += `&components=postal_code:${components.postal_code}`;
      }
    } else {
      googleUrl += `latlng=${lat},${lng}`;
    }
    googleUrl += `&key=${googleMapsKey}`;

    const response = await fetch(googleUrl);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Maps API Error:', response.status, errorText);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'geocoding',
        endpoint: 'google-maps-geocode',
        request_params: { address, lat, lng },
        response_status: response.status,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: 'Google Maps API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Google Maps returned no results:', data.status);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'geocoding',
        endpoint: 'google-maps-geocode',
        request_params: { address, lat, lng },
        response_status: 404,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: data.status,
      });

      return new Response(
        JSON.stringify({ error: 'No results found', status: data.status }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.results[0];
    const resultData = {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      address_components: result.address_components,
    };

    // Store in cache (30-day expiry)
    await supabase.from('google_maps_geocode_cache').insert({
      query_hash: queryHash,
      address: address || null,
      lat: resultData.lat,
      lng: resultData.lng,
      formatted_address: resultData.formatted_address,
      place_id: resultData.place_id,
      components: resultData.address_components,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      hit_count: 0,
    });

    // Log API call with cost
    await supabase.from('google_maps_api_logs').insert({
      api_type: 'geocoding',
      endpoint: 'google-maps-geocode',
      request_params: { address, lat, lng },
      response_status: 200,
      response_time_ms: responseTime,
      cache_hit: false,
      cost_usd: 0.005,
    });

    console.log('✅ Geocode successful, cached result');

    return new Response(
      JSON.stringify({
        ...resultData,
        cache_hit: false,
        response_time_ms: responseTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-maps-geocode:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
