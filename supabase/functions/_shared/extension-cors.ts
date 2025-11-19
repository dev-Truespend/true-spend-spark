/**
 * Extension-specific CORS handler with origin validation
 * Dynamically validates chrome-extension://, moz-extension://, and safari-web-extension:// origins
 */

const ALLOWED_ORIGINS = [
  /^chrome-extension:\/\/[a-z]{32}$/,  // Chrome extension IDs are 32 lowercase letters
  /^moz-extension:\/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, // Firefox UUID format
  /^safari-web-extension:\/\/[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/, // Safari UUID format
];

// Allow localhost for development
const DEV_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
];

export function getExtensionCorsHeaders(origin: string | null): HeadersInit {
  const isDev = Deno.env.get('ENVIRONMENT') === 'development';
  
  // Validate origin
  let allowedOrigin = '*';
  
  if (origin) {
    const isValidExtension = ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
    const isDevOrigin = isDev && DEV_ORIGINS.includes(origin);
    
    if (isValidExtension || isDevOrigin) {
      allowedOrigin = origin;
    } else {
      console.warn('[CORS] Rejected origin:', origin);
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-extension-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

export function handleExtensionCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, { 
      headers: getExtensionCorsHeaders(origin),
      status: 204,
    });
  }
  return null;
}

export function logExtensionRequest(req: Request, userId?: string) {
  const origin = req.headers.get('origin');
  const extensionId = req.headers.get('x-extension-id');
  const userAgent = req.headers.get('user-agent');
  
  console.log('[Extension Request]', {
    timestamp: new Date().toISOString(),
    origin,
    extensionId,
    userAgent,
    userId,
    method: req.method,
    url: req.url,
  });
}
