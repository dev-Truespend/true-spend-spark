import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeolocationRequest {
  ip_address?: string;
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

    const body: GeolocationRequest = await req.json().catch(() => ({}));
    
    // Extract IP from request header if not provided
    const ipAddress = body.ip_address || 
                     req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    if (ipAddress === 'unknown') {
      return new Response(
        JSON.stringify({ error: 'Could not determine IP address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Geolocation request for IP:', ipAddress);

    // Generate cache key for IP
    const encoder = new TextEncoder();
    const hashData = encoder.encode(ipAddress);
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const queryHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache (24-hour TTL for IP-based geolocation)
    const { data: cachedData } = await supabase
      .from('google_maps_geocode_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('✅ Cache HIT for IP:', ipAddress);

      await supabase
        .from('google_maps_geocode_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('query_hash', queryHash);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'geolocation',
        endpoint: 'google-geolocation',
        request_params: { ip_address: ipAddress },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
        cost_usd: 0,
      });

      return new Response(
        JSON.stringify({
          lat: cachedData.lat,
          lng: cachedData.lng,
          accuracy: 5000, // IP-based accuracy is typically 1000-5000 meters
          cache_hit: true,
          response_time_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('❌ Cache MISS - calling Google Geolocation API');

    // Call Google Geolocation API
    const googleUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${googleMapsKey}`;
    
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ considerIp: true }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Geolocation API Error:', response.status, errorText);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'geolocation',
        endpoint: 'google-geolocation',
        request_params: { ip_address: ipAddress },
        response_status: response.status,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: 'Google Geolocation API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (!data.location) {
      console.error('Google Geolocation returned no location');

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'geolocation',
        endpoint: 'google-geolocation',
        request_params: { ip_address: ipAddress },
        response_status: 404,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: 'No location found',
      });

      return new Response(
        JSON.stringify({ error: 'Location not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resultData = {
      lat: data.location.lat,
      lng: data.location.lng,
      accuracy: data.accuracy || 5000,
    };

    // Store in cache (24-hour expiry for IP-based geolocation)
    await supabase.from('google_maps_geocode_cache').insert({
      query_hash: queryHash,
      address: `IP: ${ipAddress}`,
      lat: resultData.lat,
      lng: resultData.lng,
      formatted_address: `Geolocation for ${ipAddress}`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hit_count: 0,
    });

    // Log API call with cost (very low: $0.00001 per call)
    await supabase.from('google_maps_api_logs').insert({
      api_type: 'geolocation',
      endpoint: 'google-geolocation',
      request_params: { ip_address: ipAddress },
      response_status: 200,
      response_time_ms: responseTime,
      cache_hit: false,
      cost_usd: 0.00001,
    });

    console.log('✅ Geolocation successful, cached result');

    return new Response(
      JSON.stringify({
        ...resultData,
        cache_hit: false,
        response_time_ms: responseTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-geolocation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
