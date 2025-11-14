import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutocompleteRequest {
  input: string;
  session_token: string;
  types?: string;
  components?: {
    country?: string;
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

    const body: AutocompleteRequest = await req.json();
    const { input, session_token, types, components } = body;

    if (!input || !session_token) {
      return new Response(
        JSON.stringify({ error: 'input and session_token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Autocomplete request:', { input, session_token, types });

    // NO CACHE - violates Google Terms of Service
    // Build Google API URL
    let googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&sessiontoken=${session_token}`;
    
    if (types) {
      googleUrl += `&types=${types}`;
    }
    
    if (components?.country) {
      googleUrl += `&components=country:${components.country}`;
    }
    
    googleUrl += `&key=${googleMapsKey}`;

    const response = await fetch(googleUrl);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Autocomplete API Error:', response.status, errorText);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'autocomplete',
        endpoint: 'google-maps-autocomplete',
        request_params: { input, session_token, types, components },
        response_status: response.status,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: 'Google Autocomplete API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Autocomplete returned error:', data.status);

      await supabase.from('google_maps_api_logs').insert({
        api_type: 'autocomplete',
        endpoint: 'google-maps-autocomplete',
        request_params: { input, session_token, types, components },
        response_status: 400,
        response_time_ms: responseTime,
        cache_hit: false,
        error_message: data.status,
      });

      return new Response(
        JSON.stringify({ error: 'Autocomplete error', status: data.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log API call (session-based billing: $2.83 per session, not per call)
    // We log cost as 0 here and track sessions separately
    await supabase.from('google_maps_api_logs').insert({
      api_type: 'autocomplete',
      endpoint: 'google-maps-autocomplete',
      request_params: { input, session_token, types, components },
      response_status: 200,
      response_time_ms: responseTime,
      cache_hit: false,
      cost_usd: 0, // Session cost tracked separately
    });

    console.log('✅ Autocomplete successful');

    return new Response(
      JSON.stringify({
        predictions: data.predictions || [],
        session_token: session_token,
        response_time_ms: responseTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-maps-autocomplete:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
