import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  try {
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
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData: VisionResponse = await visionResponse.json();
    
    if (visionData.responses[0]?.error) {
      throw new Error(`Vision API: ${visionData.responses[0].error.message}`);
    }

    const fullText = visionData.responses[0]?.fullTextAnnotation?.text || 
                     visionData.responses[0]?.textAnnotations?.[0]?.description || '';

    if (!fullText) {
      throw new Error('No text detected in image');
    }

    console.log('[GoogleVision] Text extracted, parsing receipt...');

    // Parse receipt data from text
    const receiptData = parseReceiptText(fullText);

    console.log('[GoogleVision] Receipt parsed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: receiptData,
        rawText: fullText,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[GoogleVision] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
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
