// OCR Receipt Processing using Lovable AI Vision
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[OCR] Processing receipt:', imageUrl);

    // Call Lovable AI vision model for OCR
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a receipt OCR system. Extract structured data from receipts and return ONLY valid JSON with this exact structure:
{
  "merchant": "store name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "items": [{"name": "item name", "price": 0.00}],
  "category": "category name",
  "confidence": 0.95,
  "rawText": "optional raw extracted text"
}

Categories must be one of: groceries, dining, transportation, entertainment, shopping, health, utilities, other.
If you cannot extract a field with confidence, use reasonable defaults (e.g., "Unknown" for merchant, current date for date).`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all information from this receipt image. Return ONLY the JSON object, no markdown or additional text.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        temperature: 0.1, // Low temperature for consistent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OCR] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('[OCR] Raw AI response:', content);

    // Parse JSON response (handle potential markdown wrapper)
    let receiptData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      receiptData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[OCR] JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate required fields
    if (!receiptData.merchant || !receiptData.amount || !receiptData.date) {
      throw new Error('Missing required fields in extracted data');
    }

    // Ensure confidence is set
    if (!receiptData.confidence) {
      receiptData.confidence = 0.8;
    }

    console.log('[OCR] Successfully extracted receipt data');

    return new Response(
      JSON.stringify(receiptData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[OCR] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
