import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

interface PlaceDetailsRequest {
  place_id: string;
  fields?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();
  console.log(`📍 [${requestId}] Google Places Details request`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleMapsKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: PlaceDetailsRequest = await req.json();
    const { place_id, fields } = body;

    if (!place_id) {
      return new Response(
        JSON.stringify({ error: 'place_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Place details request:', { place_id, fields });

    // Check cache first
    const { data: cachedData } = await supabase
      .from('google_places_cache')
      .select('*')
      .eq('place_id', place_id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('✅ Cache HIT:', place_id);

      // Increment hit count
      await supabase
        .from('google_places_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('place_id', place_id);

      // Log cache hit
      await supabase.from('google_maps_api_logs').insert({
        api_type: 'places',
        endpoint: 'google-places-details',
        request_params: { place_id, fields },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
        cost_usd: 0,
      });

      return new Response(
        JSON.stringify({
          ...cachedData.place_data,
          cache_hit: true,
          response_time_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('❌ Cache MISS - calling Google Places API');

    // Build Google API URL
    const requestedFields = fields?.join(',') || 'name,formatted_address,geometry,rating,price_level,opening_hours,photos,reviews,website,formatted_phone_number,business_status';
    const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${requestedFields}&key=${googleMapsKey}`;

    const response = await fetch(googleUrl);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API Error:', response.status, errorText);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'places',
        endpoint: 'google-places-details',
        request_params: { place_id, fields },
        response_status: response.status,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: 'Google Places API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      console.error('Google Places returned no results:', data.status);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'places',
        endpoint: 'google-places-details',
        request_params: { place_id, fields },
        response_status: 404,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: data.status,
      });

      return new Response(
        JSON.stringify({ error: 'Place not found', status: data.status }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.result;

    // Store in cache (30-day expiry)
    await supabase.from('google_places_cache').insert({
      place_id: place_id,
      place_data: result,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      hit_count: 0,
    });

    // Log API call with cost
    await supabase.from('google_maps_api_logs').insert({
      api_type: 'places',
      endpoint: 'google-places-details',
      request_params: { place_id, fields },
      response_status: 200,
      response_time_ms: responseTime,
      cache_hit: false,
      cost_usd: 0.017,
    });

    console.log('✅ Place details successful, cached result');

    return new Response(
      JSON.stringify({
        ...result,
        cache_hit: false,
        response_time_ms: responseTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-places-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
