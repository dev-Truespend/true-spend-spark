import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCircuitBreaker } from '../_shared/circuit-breaker.ts';
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from '../_shared/rate-limit-middleware.ts';
import { withRetry, VISION_RETRY_CONFIG } from '../_shared/retry-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cost constants for Google Vision API
const DEFAULT_COST_PER_REQUEST = 0.0015; // $1.50 per 1000 images
const DEFAULT_DAILY_COST_LIMIT = 5.0; // $5 daily limit per user
const DEFAULT_HOURLY_REQUEST_LIMIT = 50; // 50 requests per hour per user

// Circuit breaker for Google Vision API
const visionCircuitBreaker = getCircuitBreaker('google-vision', {
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 60000, // Try again after 1 minute
  halfOpenMaxAttempts: 3,
});

interface VisionTextAnnotation {
  description: string;
  locale?: string;
}

interface VisionResponse {
  responses: Array<{
    textAnnotations?: VisionTextAnnotation[];
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    // Get user tier configuration
    const { data: tierConfig } = await supabase
      .from('user_tier_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    const dailyCostLimit = tierConfig?.daily_cost_limit || DEFAULT_DAILY_COST_LIMIT;
    const hourlyRequestLimit = tierConfig?.hourly_request_limit || DEFAULT_HOURLY_REQUEST_LIMIT;
    const costPerRequest = DEFAULT_COST_PER_REQUEST;

    console.log(`[GoogleVision] User tier: ${tierConfig?.tier || 'default'}, Limits: $${dailyCostLimit}/day, ${hourlyRequestLimit} req/hour`);

    // Check rate limit: per-user hourly limit
    const rateLimitResult = await checkRateLimit(userId, 'google-vision-ocr', {
      requests: hourlyRequestLimit,
      windowMinutes: 60,
    });

    if (!rateLimitResult.allowed) {
      console.log(`[GoogleVision] Rate limit exceeded for user ${userId}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Check daily cost limit
    const { data: todayCosts, error: costError } = await supabase
      .from('google_vision_cost_tracking')
      .select('estimated_cost_usd')
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    if (costError) {
      console.error('[GoogleVision] Error checking costs:', costError);
    }

    const todayTotal = todayCosts?.reduce((sum, row) => sum + (row.estimated_cost_usd || 0), 0) || 0;

    if (todayTotal >= dailyCostLimit) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Daily cost limit exceeded ($${dailyCostLimit}). Current: $${todayTotal.toFixed(4)}`,
          resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders(rateLimitResult),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageUrl or imageBase64 required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error('GOOGLE_VISION_API_KEY not configured');
    }

    console.log('[GoogleVision] Processing receipt...');
    console.log(`[GoogleVision] User: ${userId}, Daily cost: $${todayTotal.toFixed(4)}/${dailyCostLimit}`);

    // Use circuit breaker with retry logic to call Google Vision API
    const retryResult = await withRetry(
      async () => {
        return await visionCircuitBreaker.execute(async () => {
      // Prepare image data
      let imageContent: string;
      if (imageBase64) {
        imageContent = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      } else {
        // Download image from URL and convert to base64
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        imageContent = base64;
      }

      // Call Google Vision API
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageContent },
                features: [
                  { type: 'TEXT_DETECTION', maxResults: 1 },
                  { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                ],
              },
            ],
          }),
        }
      );

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('[GoogleVision] API error:', visionResponse.status, errorText);
        
        // Log failed request with cost
        await supabase.from('google_vision_cost_tracking').insert({
          user_id: userId,
          endpoint: 'images:annotate',
          estimated_cost_usd: costPerRequest,
          success: false,
          error_message: `HTTP ${visionResponse.status}: ${errorText}`,
        });

        throw new Error(`Vision API error: ${visionResponse.status}`);
      }

      const visionData: VisionResponse = await visionResponse.json();
      
      if (visionData.responses[0]?.error) {
        // Log failed request with cost
        await supabase.from('google_vision_cost_tracking').insert({
          user_id: userId,
          endpoint: 'images:annotate',
          estimated_cost_usd: costPerRequest,
          success: false,
          error_message: visionData.responses[0].error.message,
        });

        throw new Error(`Vision API: ${visionData.responses[0].error.message}`);
      }

      const fullText = visionData.responses[0]?.fullTextAnnotation?.text || 
                       visionData.responses[0]?.textAnnotations?.[0]?.description || '';

      if (!fullText) {
        throw new Error('No text detected in image');
      }

          return fullText;
        });
      },
      VISION_RETRY_CONFIG
    );

    if (!retryResult.success || !retryResult.data) {
      throw new Error(retryResult.error || 'Failed to extract text from image');
    }

    const result = retryResult.data;
    console.log('[GoogleVision] Text extracted, parsing receipt...');
    console.log(`[GoogleVision] Retry stats: ${retryResult.attempts} attempt(s), ${retryResult.totalTime}ms total`);

    // Parse receipt data from text
    const receiptData = parseReceiptText(result);

    // Log successful request with cost
    const responseTime = Date.now() - startTime;
    await supabase.from('google_vision_cost_tracking').insert({
      user_id: userId,
      endpoint: 'images:annotate',
      estimated_cost_usd: costPerRequest,
      success: true,
    });

    console.log('[GoogleVision] Receipt parsed successfully');
    console.log(`[GoogleVision] Response time: ${responseTime}ms, Cost: $${costPerRequest}`);

    // Get circuit breaker status for monitoring
    const circuitStatus = visionCircuitBreaker.getStats();
    console.log(`[GoogleVision] Circuit breaker status: ${circuitStatus.state}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: receiptData,
        rawText: result,
        meta: {
          responseTime,
          costUsd: costPerRequest,
          remainingRequests: rateLimitResult.remaining,
          circuitStatus: circuitStatus.state,
          tier: tierConfig?.tier || 'default',
        },
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          ...rateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[GoogleVision] Error:', error);
    console.error(`[GoogleVision] Failed after ${responseTime}ms`);

    // Get circuit breaker status
    const circuitStatus = visionCircuitBreaker.getStats();
    console.log(`[GoogleVision] Circuit breaker status: ${circuitStatus.state}`);

    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isCircuitOpen = errorMessage.includes('Circuit breaker OPEN');

    return new Response(
      JSON.stringify({ 
        success: false,
        error: isCircuitOpen 
          ? 'Google Vision service temporarily unavailable. Using fallback service.'
          : errorMessage,
        meta: {
          responseTime,
          circuitStatus: circuitStatus.state,
        },
      }),
      { 
        status: isCircuitOpen ? 503 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Parse receipt text into structured data
 */
function parseReceiptText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract merchant (usually first non-empty line)
  const merchant = lines[0] || 'Unknown Merchant';
  
  // Extract total amount (look for patterns like "Total: $XX.XX" or "TOTAL XX.XX")
  const amountPattern = /(?:total|amount|sum)[\s:$]*(\d+[.,]\d{2})/i;
  let amount = 0;
  for (const line of lines) {
    const match = line.match(amountPattern);
    if (match) {
      amount = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }
  
  // If no "total" found, look for any price-like pattern
  if (amount === 0) {
    const pricePattern = /\$?\d+[.,]\d{2}/;
    const prices = lines
      .map(l => l.match(pricePattern)?.[0])
      .filter(Boolean)
      .map(p => parseFloat(p!.replace(/[$,]/g, '')));
    amount = Math.max(...prices, 0);
  }
  
  // Extract date (look for date patterns)
  const datePattern = /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
  let date = new Date().toISOString().split('T')[0];
  for (const line of lines) {
    const match = line.match(datePattern);
    if (match) {
      const parsedDate = new Date(match[0]);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate.toISOString().split('T')[0];
        break;
      }
    }
  }
  
  // Extract line items (lines with prices)
  const items: Array<{ name: string; price: number }> = [];
  const itemPattern = /^(.+?)\s+\$?(\d+[.,]\d{2})$/;
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match && match[1] !== merchant) {
      items.push({
        name: match[1].trim(),
        price: parseFloat(match[2].replace(',', '.')),
      });
    }
  }
  
  // Categorize based on merchant name
  const category = categorizeFromMerchant(merchant);
  
  return {
    merchant,
    amount,
    date,
    items,
    category,
    confidence: 0.85, // Google Vision typically has high confidence
    rawText: text,
  };
}

/**
 * Simple category detection from merchant name
 */
function categorizeFromMerchant(merchant: string): string {
  const lower = merchant.toLowerCase();
  
  if (/(grocery|market|food|safeway|walmart|target)/i.test(lower)) {
    return 'groceries';
  }
  if (/(restaurant|cafe|coffee|starbucks|mcdonald)/i.test(lower)) {
    return 'dining';
  }
  if (/(gas|shell|chevron|exxon|bp)/i.test(lower)) {
    return 'transportation';
  }
  if (/(pharmacy|cvs|walgreens|health)/i.test(lower)) {
    return 'health';
  }
  if (/(amazon|ebay|store|shop)/i.test(lower)) {
    return 'shopping';
  }
  
  return 'other';
}
