import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Security headers configuration
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=(self), payment=(self)',
};

// Sanitize input to prevent XSS
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim();
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Extract API version from path (e.g., /v1/endpoint)
    const versionMatch = path.match(/^\/(v\d+)\//);
    const apiVersion = versionMatch ? versionMatch[1] : 'v1';

    console.log(`API Gateway: ${req.method} ${path} (${apiVersion})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting check
    const rateLimitResponse = await fetch(`${supabaseUrl}/functions/v1/rate-limiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('authorization') || '',
      },
      body: JSON.stringify({ endpoint: path }),
    });

    if (!rateLimitResponse.ok) {
      const rateLimitData = await rateLimitResponse.json();
      return new Response(
        JSON.stringify(rateLimitData),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...securityHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimitData.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // Parse and sanitize request body
    let body: any = null;
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      try {
        body = await req.json();
        body = sanitizeInput(body);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          {
            status: 400,
            headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Route to appropriate handler based on path
    // Example routing - extend as needed
    if (path.includes('/health')) {
      return await fetch(`${supabaseUrl}/functions/v1/health-check`, {
        method: 'GET',
        headers: {
          'Authorization': req.headers.get('authorization') || '',
        },
      });
    }

    // Default response for unhandled routes
    return new Response(
      JSON.stringify({
        message: 'API Gateway',
        version: apiVersion,
        path,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
          'Content-Type': 'application/json',
          'X-API-Version': apiVersion,
        },
      }
    );

  } catch (error) {
    console.error('Error in api-gateway function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
