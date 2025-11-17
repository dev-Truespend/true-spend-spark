import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationPayload {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const locationSecret = Deno.env.get('LOCATION_SIGNING_SECRET')!;

    // Create authenticated client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const { lat, lng, timestamp, accuracy }: LocationPayload = await req.json();

    // Validate input
    if (typeof lat !== 'number' || typeof lng !== 'number' || 
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof accuracy !== 'number' || accuracy < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid accuracy value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided timestamp or current time
    const locationTimestamp = timestamp || Date.now();
    
    // Check if timestamp is not too old (> 5 minutes)
    const timeDiff = Date.now() - locationTimestamp;
    if (timeDiff > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: 'Location timestamp too old' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create JWT payload
    const payload = {
      user_id: user.id,
      lat: lat,
      lng: lng,
      timestamp: locationTimestamp,
      accuracy: accuracy,
      iat: Math.floor(Date.now() / 1000),
    };

    // Sign JWT (expires in 5 minutes)
    const secret = new TextEncoder().encode(locationSecret);
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    console.log(`Location token signed for user ${user.id} at (${lat}, ${lng})`);

    return new Response(
      JSON.stringify({ 
        token,
        expires_at: expiresAt,
        user_id: user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in sign-location-payload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
