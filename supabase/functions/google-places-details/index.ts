import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCircuitBreaker } from '../_shared/circuit-breaker.ts';
import { createRequestLogger } from '../_shared/request-logger.ts';
import { withFallback, withRetry, withTimeout } from '../_shared/graceful-degradation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

interface PlaceDetailsRequest {
  place_id: string;
  fields?: string[];
}

Deno.serve(async (req) => {
  const logger = createRequestLogger('google-places-details', req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    logger.logRequest(req);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleMapsKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: PlaceDetailsRequest = await req.json();
    const { place_id, fields } = body;

    if (!place_id) {
      logger.logWarning('Missing place_id parameter');
      return new Response(
        JSON.stringify({ error: 'place_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.logInfo('Place details request', { place_id, fields });

    // Check cache first
    const { data: cachedData } = await supabase
      .from('google_places_cache')
      .select('*')
      .eq('place_id', place_id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      logger.logInfo('Cache HIT', { place_id });

      await supabase
        .from('google_places_cache')
        .update({ hit_count: (cachedData.hit_count || 0) + 1 })
        .eq('place_id', place_id);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'places',
        endpoint: 'google-places-details',
        request_params: { place_id, fields },
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: true,
        cost_usd: 0,
      });

      const response = new Response(
        JSON.stringify({
          ...cachedData.place_data,
          cache_hit: true,
          response_time_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
      logger.logResponse(response);
      return response;
    }

    logger.logInfo('Cache MISS - calling Google Places API');

    const circuitBreaker = getCircuitBreaker('google-places-api', {
      failureThreshold: 3,
      resetTimeout: 30000,
    });

    const requestedFields = fields?.join(',') || 'name,formatted_address,geometry,rating,price_level,opening_hours,photos,reviews,website,formatted_phone_number,business_status';
    
    const placeDetails = await withFallback(
      () => withRetry(
        () => withTimeout(
          () => circuitBreaker.execute(async () => {
            const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${requestedFields}&key=${googleMapsKey}`;
            
            logger.logInfo('Calling Google Places API');
            const response = await fetch(googleUrl);
            const responseTime = Date.now() - startTime;

            if (!response.ok) {
              const errorText = await response.text();
              await supabase.from('google_maps_api_logs').insert({
                api_type: 'places',
                endpoint: 'google-places-details',
                request_params: { place_id, fields },
                response_status: response.status,
                response_time_ms: responseTime,
                cache_hit: false,
                error_message: errorText,
              });
              throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.status !== 'OK' || !data.result) {
              await supabase.from('google_maps_api_logs').insert({
                api_type: 'places',
                endpoint: 'google-places-details',
                request_params: { place_id, fields },
                response_status: 200,
                response_time_ms: responseTime,
                cache_hit: false,
                error_message: `Status: ${data.status}`,
              });
              throw new Error(`Google Places returned no results: ${data.status}`);
            }

            return data.result;
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
        fallbackValue: null,
        cacheKey: `google-place-${place_id}`,
        cacheDuration: 300000,
        onError: (error) => {
          logger.logError(error, { place_id, service: 'google-places' });
        }
      }
    );

    if (!placeDetails) {
      logger.logWarning('Place details not found', { place_id });
      return new Response(
        JSON.stringify({ error: 'Place not found or service temporarily unavailable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('google_places_cache').upsert({
      place_id,
      place_data: placeDetails,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      hit_count: 0,
    });

    await supabase.from('google_maps_api_logs').insert({
      api_type: 'places',
      endpoint: 'google-places-details',
      request_params: { place_id, fields },
      response_status: 200,
      response_time_ms: Date.now() - startTime,
      cache_hit: false,
      cost_usd: 0.017,
    });

    logger.logInfo('Successfully fetched place details', { place_id });
    
    const response = new Response(
      JSON.stringify({
        ...placeDetails,
        cache_hit: false,
        response_time_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
    logger.logResponse(response);
    return response;

  } catch (error) {
    logger.logError(error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        fallback: 'Service temporarily unavailable'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
