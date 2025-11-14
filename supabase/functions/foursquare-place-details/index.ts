import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const foursquareApiKey = Deno.env.get('FOURSQUARE_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { fsq_id } = await req.json();

    if (!fsq_id) {
      return new Response(
        JSON.stringify({ error: 'fsq_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Foursquare Place Details:', fsq_id);

    // Check cache first
    const { data: cachedData } = await supabase
      .from('place_enrichment_cache')
      .select('place_data, hit_count')
      .eq('fsq_id', fsq_id)
      .eq('enrichment_type', 'details')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('✅ Cache HIT for place:', fsq_id);
      
      // Increment hit count
      await supabase
        .from('place_enrichment_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('fsq_id', fsq_id);

      // Log cache hit
      await supabase.from('foursquare_api_logs').insert({
        endpoint: '/places/details',
        request_params: { fsq_id },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
      });

      return new Response(
        JSON.stringify({ place: cachedData.place_data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('❌ Cache MISS - Fetching from Foursquare API');

    // Fetch from Foursquare API
    const foursquareUrl = `https://api.foursquare.com/v3/places/${fsq_id}?fields=fsq_id,name,categories,location,geocodes,hours,rating,popularity,price,chains,photos,tips`;

    const response = await fetch(foursquareUrl, {
      headers: {
        'Authorization': foursquareApiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Foursquare API Error:', response.status, errorText);
      
      await supabase.from('foursquare_api_logs').insert({
        endpoint: '/places/details',
        request_params: { fsq_id },
        response_status: response.status,
        response_time_ms: Date.now() - startTime,
        cache_hit: false,
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: 'Foursquare API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place = await response.json();

    console.log('✅ Fetched place details:', place.name);

    // Store/update in foursquare_places table
    await supabase.from('foursquare_places').upsert({
      fsq_id: place.fsq_id,
      name: place.name,
      categories: place.categories || [],
      primary_category: place.categories?.[0]?.name,
      location: place.location,
      geocodes: place.geocodes,
      chains: place.chains,
      hours: place.hours,
      rating: place.rating,
      popularity: place.popularity,
      price_tier: place.price,
      metadata: place,
    }, { onConflict: 'fsq_id' });

    // Cache the result (30 days)
    await supabase.from('place_enrichment_cache').insert({
      fsq_id: place.fsq_id,
      place_data: place,
      enrichment_type: 'details',
      hit_count: 0,
    });

    // Log API call
    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/places/details',
      request_params: { fsq_id },
      response_status: 200,
      response_time_ms: Date.now() - startTime,
      cache_hit: false,
    });

    return new Response(
      JSON.stringify({ place, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in foursquare-place-details:', error);
    
    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/places/details',
      request_params: await req.json().catch(() => ({})),
      response_status: 500,
      response_time_ms: Date.now() - startTime,
      cache_hit: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
