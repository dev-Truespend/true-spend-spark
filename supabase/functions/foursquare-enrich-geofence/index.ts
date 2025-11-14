import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichRequest {
  geofence_event_id: string;
  lat: number;
  lng: number;
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { geofence_event_id, lat, lng, user_id }: EnrichRequest = await req.json();

    console.log('🏪 Enriching geofence event:', geofence_event_id);

    // Call foursquare-places-search to find nearby places
    const searchResponse = await fetch(`${supabaseUrl}/functions/v1/foursquare-places-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lat,
        lng,
        radius: 50, // 50 meters
        limit: 5,
      }),
    });

    if (!searchResponse.ok) {
      console.error('Failed to search places:', await searchResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to search nearby places' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { results: places } = await searchResponse.json();

    if (!places || places.length === 0) {
      console.log('⚠️ No places found nearby');
      return new Response(
        JSON.stringify({ message: 'No places found nearby', enriched: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select the closest/best match (first result is usually best)
    const bestMatch = places[0];
    
    console.log('✅ Best match found:', bestMatch.name, bestMatch.categories?.[0]?.name);

    // Build enrichment metadata
    const enrichmentData = {
      place: {
        fsq_id: bestMatch.fsq_id,
        name: bestMatch.name,
        category: bestMatch.categories?.[0]?.name,
        chain: bestMatch.chains?.[0]?.name || null,
        address: bestMatch.location?.formatted_address || bestMatch.location?.address,
        distance_meters: bestMatch.distance,
      },
      enriched_at: new Date().toISOString(),
    };

    // Update geofence_events with enriched data
    const { error: updateError } = await supabase
      .from('geofence_events')
      .update({
        metadata: enrichmentData,
      })
      .eq('id', geofence_event_id);

    if (updateError) {
      console.error('Failed to update geofence event:', updateError);
      throw updateError;
    }

    // Check if merchant exists, if not create it
    let merchantId = null;
    
    const { data: existingMerchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('fsq_id', bestMatch.fsq_id)
      .maybeSingle();

    if (existingMerchant) {
      merchantId = existingMerchant.id;
    } else {
      // Create new merchant
      const { data: newMerchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          name: bestMatch.name,
          place_id: bestMatch.fsq_id,
          fsq_id: bestMatch.fsq_id,
          chain_name: bestMatch.chains?.[0]?.name,
          category: bestMatch.categories?.[0]?.name,
          address: bestMatch.location?.formatted_address,
          lat: bestMatch.geocodes?.main?.latitude,
          lng: bestMatch.geocodes?.main?.longitude,
          foursquare_verified: true,
          last_foursquare_sync: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (!merchantError && newMerchant) {
        merchantId = newMerchant.id;
        
        // Create merchant-foursquare mapping
        await supabase.from('merchant_foursquare_mapping').insert({
          merchant_id: newMerchant.id,
          fsq_id: bestMatch.fsq_id,
          confidence_score: 0.95,
          match_method: 'auto',
          verified_at: new Date().toISOString(),
        });
      }
    }

    // Log enrichment
    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/enrich-geofence',
      request_params: { geofence_event_id, lat, lng },
      response_status: 200,
      response_time_ms: Date.now() - startTime,
      cache_hit: false,
      user_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        enriched: true,
        place: enrichmentData.place,
        merchant_id: merchantId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in foursquare-enrich-geofence:', error);
    
    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/enrich-geofence',
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
