import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { extractTextFromImage } from '../_shared/hf-client.ts';
import { canMakeRequest, recordSuccess, recordFailure } from '../_shared/hf-circuit-breaker.ts';
import { corsHeaders } from '../_shared/error-response.ts';

const CIRCUIT_NAME = 'huggingface-ocr';

interface OCRRequest {
  imageUrl?: string;
  imageBase64?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Check circuit breaker
    if (!canMakeRequest(CIRCUIT_NAME)) {
      console.log('[HF OCR] Circuit breaker is OPEN, service unavailable');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'HF OCR service temporarily unavailable',
          fallback: true,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, imageBase64 }: OCRRequest = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing image data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let base64Image = imageBase64;

    // Download image if URL provided
    if (imageUrl && !base64Image) {
      console.log('[HF OCR] Downloading image from URL...');
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    }

    if (!base64Image) {
      throw new Error('Failed to get image data');
    }

    console.log('[HF OCR] Processing image with Hugging Face...');

    // Call HF Inference API
    const result = await extractTextFromImage(base64Image);

    if (!result.success) {
      recordFailure(CIRCUIT_NAME, result.error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'OCR failed',
          method: 'hf-server',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    recordSuccess(CIRCUIT_NAME);

    const latency = Date.now() - startTime;

    // Log to metrics
    await supabaseClient.from('system_metrics').insert({
      metric_name: 'hf_ocr_request',
      value: latency,
      unit: 'ms',
      tags: {
        success: true,
        model: result.model,
        user_id: user.id,
      },
    });

    console.log(`[HF OCR] Success in ${latency}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rawText: result.data?.generated_text || '',
          confidence: 0.8, // HF doesn't provide confidence
          method: 'hf-server',
          model: result.model,
          latencyMs: latency,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    recordFailure(CIRCUIT_NAME, error.message);
    
    const latency = Date.now() - startTime;
    console.error('[HF OCR] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        method: 'hf-server',
        latencyMs: latency,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
