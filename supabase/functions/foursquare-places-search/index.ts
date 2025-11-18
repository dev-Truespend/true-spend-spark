import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { getCircuitBreaker } from '../_shared/circuit-breaker.ts';
import { createRequestLogger } from '../_shared/request-logger.ts';
import { withFallback, withRetry, withTimeout } from '../_shared/graceful-degradation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
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
  const logger = createRequestLogger('foursquare-places-search', req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const foursquareApiKey = Deno.env.get('FOURSQUARE_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    logger.logRequest(req);
    
    const { lat, lng, radius = 100, categories, query, limit = 10 }: SearchParams = await req.json();

    logger.logInfo('Foursquare Places Search', { lat, lng, radius, categories, query, limit });

    const cacheKey = `search_${lat}_${lng}_${radius}_${categories || 'all'}_${query || 'none'}`;
    
    const { data: cachedData } = await supabase
      .from('place_enrichment_cache')
      .select('place_data, hit_count')
      .eq('fsq_id', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      logger.logInfo('Cache HIT', { cacheKey });
      
      await supabase
        .from('place_enrichment_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('fsq_id', cacheKey);

      await supabase.from('foursquare_api_logs').insert({
        endpoint: '/places/search',
        request_params: { lat, lng, radius, categories, query },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
      });

      const response = new Response(
        JSON.stringify({ results: cachedData.place_data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
      logger.logResponse(response);
      return response;
    }

    logger.logInfo('Cache MISS - Fetching from Foursquare API');

    const circuitBreaker = getCircuitBreaker('foursquare-api', {
      failureThreshold: 3,
      resetTimeout: 30000,
    });

    const places = await withFallback(
      () => withRetry(
        () => withTimeout(
          () => circuitBreaker.execute(async () => {
            const params = new URLSearchParams({
              ll: `${lat},${lng}`,
              radius: radius.toString(),
              limit: limit.toString(),
            });

            if (categories) params.append('categories', categories);
            if (query) params.append('query', query);

            const foursquareUrl = `https://api.foursquare.com/v3/places/search?${params}`;

            logger.logInfo('Calling Foursquare API');
            const response = await fetch(foursquareUrl, {
              headers: {
                'Authorization': foursquareApiKey,
                'Accept': 'application/json',
              },
            });

            if (!response.ok) {
              const errorText = await response.text();
              await supabase.from('foursquare_api_logs').insert({
                endpoint: '/places/search',
                request_params: { lat, lng, radius, categories, query },
                response_status: response.status,
                response_time_ms: Date.now() - startTime,
                cache_hit: false,
                error_message: errorText,
              });
              throw new Error(`Foursquare API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.results || [];
          }),
          { timeoutMs: 10000 }
        ),
        { 
          maxRetries: 2,
          initialDelay: 500,
          retryableErrors: (error) => {
            return error.message.includes('fetch') || error.message.includes('timeout');
          }
        }
      ),
      {
        fallbackValue: [],
        cacheKey: `foursquare-search-${lat}-${lng}`,
        cacheDuration: 300000,
        onError: (error) => {
          logger.logError(error, { lat, lng, query, service: 'foursquare' });
        }
      }
    );

    logger.logInfo('Found places from Foursquare', { count: places.length });

    for (const place of places) {
      await supabase.from('foursquare_places').upsert({
        fsq_id: place.fsq_id,
        name: place.name,
        categories: place.categories,
        geocodes: place.geocodes,
        location: place.location,
        popularity: place.popularity,
        price_tier: place.price,
        rating: place.rating,
        chains: place.chains,
        metadata: place,
        last_verified_at: new Date().toISOString(),
      }, { onConflict: 'fsq_id' });
    }

    await supabase.from('place_enrichment_cache').upsert({
      fsq_id: cacheKey,
      place_data: places,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hit_count: 0,
    });

    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/places/search',
      request_params: { lat, lng, radius, categories, query },
      response_status: 200,
      response_time_ms: Date.now() - startTime,
      cache_hit: false,
    });

    logger.logInfo('Successfully fetched Foursquare places', { count: places.length });

    const response = new Response(
      JSON.stringify({ results: places, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
    logger.logResponse(response);
    return response;

  } catch (error) {
    logger.logError(error);

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        fallback: 'Service temporarily unavailable, returning empty results',
        results: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
