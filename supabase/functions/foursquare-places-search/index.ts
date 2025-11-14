import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  lat: number;
  lng: number;
  radius?: number;
  categories?: string;
  query?: string;
  limit?: number;
}

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
    const { lat, lng, radius = 100, categories, query, limit = 10 }: SearchParams = await req.json();

    console.log('🔍 Foursquare Places Search:', { lat, lng, radius, categories, query, limit });

    // Build cache key
    const cacheKey = `search_${lat}_${lng}_${radius}_${categories || 'all'}_${query || 'none'}`;
    
    // Check cache first
    const { data: cachedData } = await supabase
      .from('place_enrichment_cache')
      .select('place_data, hit_count')
      .eq('fsq_id', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('✅ Cache HIT for:', cacheKey);
      
      // Increment hit count
      await supabase
        .from('place_enrichment_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('fsq_id', cacheKey);

      // Log cache hit
      await supabase.from('foursquare_api_logs').insert({
        endpoint: '/places/search',
        request_params: { lat, lng, radius, categories, query },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
      });

      return new Response(
        JSON.stringify({ results: cachedData.place_data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('❌ Cache MISS - Fetching from Foursquare API');

    // Build Foursquare API URL
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: radius.toString(),
      limit: limit.toString(),
    });

    if (categories) params.append('categories', categories);
    if (query) params.append('query', query);

    const foursquareUrl = `https://api.foursquare.com/v3/places/search?${params}`;

    // Call Foursquare API
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
        endpoint: '/places/search',
        request_params: { lat, lng, radius, categories, query },
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

    const data = await response.json();
    const places = data.results || [];

    console.log(`✅ Found ${places.length} places from Foursquare`);

    // Store each place in foursquare_places table
    for (const place of places) {
      await supabase.from('foursquare_places').upsert({
        fsq_id: place.fsq_id,
        name: place.name,
        categories: place.categories || [],
        primary_category: place.categories?.[0]?.name,
        location: place.location,
        geocodes: place.geocodes,
        chains: place.chains,
        rating: place.rating,
        popularity: place.popularity,
        price_tier: place.price,
        metadata: place,
      }, { onConflict: 'fsq_id' });
    }

    // Cache the results (30 days)
    await supabase.from('place_enrichment_cache').insert({
      fsq_id: cacheKey,
      place_data: places,
      enrichment_type: 'search',
      hit_count: 0,
    });

    // Log API call
    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/places/search',
      request_params: { lat, lng, radius, categories, query },
      response_status: 200,
      response_time_ms: Date.now() - startTime,
      cache_hit: false,
    });

    return new Response(
      JSON.stringify({ results: places, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in foursquare-places-search:', error);
    
    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/places/search',
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
