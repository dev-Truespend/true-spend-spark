import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface CategorizationRequest {
  description: string;
  merchant_name?: string;
  amount?: number;
  location_type?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const input: CategorizationRequest = await req.json();

    if (!input.description) {
      return new Response(JSON.stringify({ error: 'Description is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        model: 'google/gemini-2.5-flash-lite', // Fast & cheap for classification
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
        temperature: 0.3, // Low temperature for consistent categorization
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI categorization failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from AI response
    let result;
    try {
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    // Validate required fields
    if (!result.category || typeof result.confidence !== 'number') {
      throw new Error('AI response missing required fields');
    }

    // Log categorization for future improvements
    await supabase.from('api_request_log').insert({
      user_id: user.id,
      endpoint: '/ai-categorize-transaction',
      method: 'POST',
      status_code: 200,
      payload_size_bytes: JSON.stringify(input).length,
    });

    return new Response(
      JSON.stringify({
        category: result.category,
        confidence: result.confidence,
        merchant_normalized: result.merchant_normalized || input.merchant_name,
        original_description: input.description,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('AI categorization error:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});