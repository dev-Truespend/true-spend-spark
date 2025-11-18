/**
 * Standardized error response helper for edge functions
 * Ensures consistent error handling across all endpoints
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  correlationId: string;
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: any
): Response {
  const errorBody: ErrorDetails = {
    code,
    message,
    correlationId: crypto.randomUUID(),
    ...(details && { details }),
  };

  console.error('[ErrorResponse]', {
    code,
    message,
    status,
    correlationId: errorBody.correlationId,
    details,
  });

  return new Response(JSON.stringify({ ok: false, error: errorBody }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function successResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export { corsHeaders };
