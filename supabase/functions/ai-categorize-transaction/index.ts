import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface CategorizationRequest {
  description: string;
  merchant_name?: string;
  amount?: number;
  location_type?: string;
}

// Deterministic fallback categorizer
function fallbackCategorize(description: string): { category: string; confidence: number } {
  const desc = description.toLowerCase();
  
  // Simple rule-based categorization
  if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('food')) {
    return { category: 'Dining', confidence: 0.7 };
  }
  if (desc.includes('grocery') || desc.includes('market') || desc.includes('supermarket')) {
    return { category: 'Groceries', confidence: 0.7 };
  }
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('parking') || desc.includes('uber') || desc.includes('lyft')) {
    return { category: 'Transportation', confidence: 0.7 };
  }
  if (desc.includes('store') || desc.includes('shop') || desc.includes('retail')) {
    return { category: 'Shopping', confidence: 0.6 };
  }
  if (desc.includes('movie') || desc.includes('theater') || desc.includes('game') || desc.includes('entertainment')) {
    return { category: 'Entertainment', confidence: 0.7 };
  }
  if (desc.includes('pharmacy') || desc.includes('doctor') || desc.includes('hospital') || desc.includes('gym')) {
    return { category: 'Health', confidence: 0.7 };
  }
  if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') || desc.includes('phone') || desc.includes('utility')) {
    return { category: 'Utilities', confidence: 0.7 };
  }
  if (desc.includes('hotel') || desc.includes('flight') || desc.includes('travel') || desc.includes('airline')) {
    return { category: 'Travel', confidence: 0.7 };
  }
  
  return { category: 'Other', confidence: 0.5 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-request-id') || `req-${Date.now()}`;
  console.log(`[${correlationId}] AI categorization request`);

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[${correlationId}] Auth error:`, authError);
      return new Response(JSON.stringify({ 
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          correlationId,
        }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const input: CategorizationRequest = await req.json();

    if (!input.description) {
      return new Response(JSON.stringify({ 
        ok: false,
        error: {
          code: 'MISSING_DESCRIPTION',
          message: 'Description is required',
          correlationId,
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check feature flag for AI categorization
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled, config')
      .eq('flag_name', 'ai_categorization_enabled')
      .single();

    const aiEnabled = featureFlag?.enabled !== false;
    console.log(`[${correlationId}] AI categorization enabled: ${aiEnabled}`);

    let result;
    let usedFallback = false;

    if (aiEnabled && LOVABLE_API_KEY) {
      // Try AI categorization
      try {
        // Prepare context for AI
        const context = [
          `Transaction description: ${input.description}`,
          input.merchant_name ? `Merchant: ${input.merchant_name}` : '',
          input.amount ? `Amount: $${input.amount}` : '',
          input.location_type ? `Location type: ${input.location_type}` : '',
        ].filter(Boolean).join('\n');

        const systemPrompt = `You are a transaction categorization AI. Analyze transaction details and return ONLY a JSON object with this exact structure:
{
  "category": "one of: Dining, Groceries, Transportation, Shopping, Entertainment, Health, Utilities, Travel, Other",
  "confidence": 0.0 to 1.0,
  "merchant_normalized": "cleaned merchant name"
}

Rules:
- Dining: Restaurants, cafes, bars, food delivery
- Groceries: Supermarkets, grocery stores, farmers markets
- Transportation: Gas, parking, public transit, ride-sharing
- Shopping: Retail stores, online shopping, clothing
- Entertainment: Movies, concerts, streaming services, games
- Health: Pharmacies, doctors, gyms, wellness
- Utilities: Electric, water, internet, phone bills
- Travel: Hotels, flights, car rentals
- Other: Anything that doesn't fit above categories

Return ONLY the JSON, no additional text.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: context },
            ],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            console.warn(`[${correlationId}] Rate limit, using fallback`);
            throw new Error('RATE_LIMIT');
          }
          if (aiResponse.status === 402) {
            console.warn(`[${correlationId}] Credits depleted, using fallback`);
            throw new Error('CREDITS_DEPLETED');
          }
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (!content) throw new Error('No content in AI response');

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Could not extract JSON');

        result = JSON.parse(jsonMatch[0]);
        console.log(`[${correlationId}] AI success: ${result.category}`);

      } catch (aiError) {
        console.error(`[${correlationId}] AI error, using fallback:`, aiError);
        const fallback = fallbackCategorize(input.description);
        result = {
          category: fallback.category,
          confidence: fallback.confidence,
          merchant_normalized: input.description,
        };
        usedFallback = true;
      }
    } else {
      console.log(`[${correlationId}] Using fallback (AI disabled)`);
      const fallback = fallbackCategorize(input.description);
      result = {
        category: fallback.category,
        confidence: fallback.confidence,
        merchant_normalized: input.description,
      };
      usedFallback = true;
    }

    await supabase.from('api_request_log').insert({
      user_id: user.id,
      endpoint: 'ai-categorize-transaction',
      method: 'POST',
      status_code: 200,
      cache_hit: usedFallback,
    });

    return new Response(JSON.stringify({
      ok: true,
      data: {
        ...result,
        original_description: input.description,
        used_fallback: usedFallback,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    return new Response(JSON.stringify({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      },
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});