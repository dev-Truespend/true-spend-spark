import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { classifyText } from '../_shared/hf-client.ts';
import { canMakeRequest, recordSuccess, recordFailure } from '../_shared/hf-circuit-breaker.ts';
import { corsHeaders } from '../_shared/error-response.ts';

const CIRCUIT_NAME = 'huggingface-categorize';

const CATEGORIES = [
  'groceries',
  'dining',
  'transportation',
  'entertainment',
  'shopping',
  'utilities',
  'healthcare',
  'travel',
  'other',
];

interface CategorizeRequest {
  merchantName?: string;
  description?: string;
  amount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Check circuit breaker
    if (!canMakeRequest(CIRCUIT_NAME)) {
      console.log('[HF Categorize] Circuit breaker is OPEN, service unavailable');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'HF categorization service temporarily unavailable',
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

    const { merchantName, description, amount }: CategorizeRequest = await req.json();

    if (!merchantName && !description) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing merchant name or description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create input text
    const parts: string[] = [];
    if (merchantName) parts.push(`Merchant: ${merchantName}`);
    if (description) parts.push(`Description: ${description}`);
    if (amount !== undefined) parts.push(`Amount: $${amount.toFixed(2)}`);
    const inputText = parts.join('. ');

    console.log('[HF Categorize] Categorizing:', inputText);

    // Call HF Inference API
    const result = await classifyText(inputText, CATEGORIES);

    if (!result.success) {
      recordFailure(CIRCUIT_NAME, result.error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Categorization failed',
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

    // Extract best category from HF response
    // HF returns array of {label, score} objects
    const predictions = result.data as Array<{ label: string; score: number }>;
    const category = predictions[0]?.label || 'other';
    const confidence = predictions[0]?.score || 0;

    // Log to metrics
    await supabaseClient.from('system_metrics').insert({
      metric_name: 'hf_categorize_request',
      metric_value: latency,
      unit: 'ms',
      metadata: {
        success: true,
        category,
        confidence,
        model: result.model,
        user_id: user.id,
      },
    });

    console.log(`[HF Categorize] Categorized as "${category}" (${(confidence * 100).toFixed(1)}%) in ${latency}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          category,
          confidence,
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
    console.error('[HF Categorize] Error:', error);

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
