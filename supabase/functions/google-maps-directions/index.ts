import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DirectionsRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: Array<{ lat: number; lng: number }>;
  mode?: 'driving' | 'walking' | 'transit' | 'bicycling';
  optimize_waypoints?: boolean;
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

    const body: DirectionsRequest = await req.json();
    const { origin, destination, waypoints, mode, optimize_waypoints } = body;

    if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return new Response(
        JSON.stringify({ error: 'origin and destination with lat/lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Directions request:', { origin, destination, waypoints, mode });

    // Generate cache key for route
    const routeString = JSON.stringify({
      origin,
      destination,
      waypoints: waypoints || [],
      mode: mode || 'driving',
      optimize: optimize_waypoints || false,
    });
    const encoder = new TextEncoder();
    const hashData = encoder.encode(routeString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const queryHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache (7-day TTL for routes)
    const { data: cachedData } = await supabase
      .from('google_maps_geocode_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData && cachedData.components) {
      console.log('✅ Cache HIT for route:', queryHash);

      await supabase
        .from('google_maps_geocode_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('query_hash', queryHash);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'directions',
        endpoint: 'google-maps-directions',
        request_params: { origin, destination, waypoints, mode },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
        cost_usd: 0,
      });

      return new Response(
        JSON.stringify({
          ...cachedData.components,
          cache_hit: true,
          response_time_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('❌ Cache MISS - calling Google Directions API');

    // Build Google API URL
    let googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
    
    if (waypoints && waypoints.length > 0) {
      const waypointsParam = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
      googleUrl += `&waypoints=${optimize_waypoints ? 'optimize:true|' : ''}${waypointsParam}`;
    }
    
    googleUrl += `&mode=${mode || 'driving'}&key=${googleMapsKey}`;

    const response = await fetch(googleUrl);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Directions API Error:', response.status, errorText);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'directions',
        endpoint: 'google-maps-directions',
        request_params: { origin, destination, waypoints, mode },
        response_status: response.status,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: 'Google Directions API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      console.error('Google Directions returned no routes:', data.status);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'directions',
        endpoint: 'google-maps-directions',
        request_params: { origin, destination, waypoints, mode },
        response_status: 404,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: data.status,
      });

      return new Response(
        JSON.stringify({ error: 'No route found', status: data.status }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resultData = {
      routes: data.routes,
      geocoded_waypoints: data.geocoded_waypoints,
    };

    // Store in cache (7-day expiry for routes)
    await supabase.from('google_maps_geocode_cache').insert({
      query_hash: queryHash,
      address: `Route: ${origin.lat},${origin.lng} to ${destination.lat},${destination.lng}`,
      lat: origin.lat,
      lng: origin.lng,
      formatted_address: `Directions (${mode || 'driving'})`,
      components: resultData,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      hit_count: 0,
    });

    // Log API call with cost
    await supabase.from('google_maps_api_logs').insert({
      api_type: 'directions',
      endpoint: 'google-maps-directions',
      request_params: { origin, destination, waypoints, mode },
      response_status: 200,
      response_time_ms: responseTime,
      cache_hit: false,
      cost_usd: 0.005,
    });

    console.log('✅ Directions successful, cached result');

    return new Response(
      JSON.stringify({
        ...resultData,
        cache_hit: false,
        response_time_ms: responseTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-maps-directions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
