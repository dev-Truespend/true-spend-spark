// OCR receipt processing fallback using Claude Vision.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const model = Deno.env.get("ANTHROPIC_MODEL_VISION") || Deno.env.get("ANTHROPIC_MODEL_FAST") || "claude-haiku-4-5-20251001";

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Could not fetch receipt image: ${imageResponse.status}`);
    const mediaType = imageResponse.headers.get("content-type") || "image/jpeg";
    const imageData = arrayBufferToBase64(await imageResponse.arrayBuffer());

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0,
        system: `Extract structured data from a receipt. Return ONLY JSON:
{
  "merchant": "store name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "items": [{"name": "item name", "price": 0.00}],
  "category": "groceries | dining | transportation | entertainment | shopping | health | utilities | other",
  "confidence": 0.95,
  "rawText": "optional raw extracted text"
}`,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Extract all visible receipt information. Return only valid JSON." },
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageData },
            },
          ],
        }],
      }),
    });

    if (!response.ok) throw new Error(`Claude OCR failed: ${response.status}`);
    const data = await response.json();
    const content = data.content?.find((part: { type: string }) => part.type === "text")?.text;
    if (!content) throw new Error("No OCR response text");

    const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, content];
    const receiptData = JSON.parse(jsonMatch[1].trim());

    if (!receiptData.merchant || !receiptData.amount || !receiptData.date) {
      throw new Error("Missing required fields in extracted receipt data");
    }

    return new Response(JSON.stringify({ confidence: 0.8, ...receiptData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ocr-process-receipt] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
