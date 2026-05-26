import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  token: string;
  lat: number;
  lng: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const locationSecret = Deno.env.get('LOCATION_SIGNING_SECRET')!;

    if (!locationSecret) {
      console.error('LOCATION_SIGNING_SECRET not configured');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Server configuration error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { token, lat, lng }: VerifyRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT signature and expiration
    const secret = new TextEncoder().encode(locationSecret);
    let verified;
    
    try {
      verified = await jose.jwtVerify(token, secret);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('JWT verification failed:', errorMessage);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid or expired token' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = verified.payload as any;

    // Validate payload structure
    if (!payload.user_id || typeof payload.lat !== 'number' || 
        typeof payload.lng !== 'number' || !payload.timestamp) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid token payload' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if timestamp is not too old (> 5 minutes from token creation)
    const tokenAge = Date.now() - payload.timestamp;
    if (tokenAge > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Location data too old' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinates match (allow small floating point differences)
    const latDiff = Math.abs(payload.lat - lat);
    const lngDiff = Math.abs(payload.lng - lng);
    const tolerance = 0.00001; // ~1 meter

    if (latDiff > tolerance || lngDiff > tolerance) {
      console.warn(`Location mismatch`, {
        userId: payload.user_id,
        latDiff,
        lngDiff,
      });
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Location coordinates do not match token' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Location verified`, { userId: payload.user_id });

    // Token is valid
    return new Response(
      JSON.stringify({ 
        valid: true,
        user_id: payload.user_id,
        timestamp: payload.timestamp,
        accuracy: payload.accuracy
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-location-payload:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
