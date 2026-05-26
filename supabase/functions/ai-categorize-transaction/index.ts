import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

interface CategorizationRequest {
  description: string;
  merchant_name?: string;
  amount?: number;
  location_type?: string;
}

interface CategorizationResult {
  category: string;
  confidence: number;
  merchant_normalized: string;
}

function fallbackCategorize(description: string): { category: string; confidence: number } {
  const desc = description.toLowerCase();

  if (desc.includes("restaurant") || desc.includes("cafe") || desc.includes("food")) {
    return { category: "Dining", confidence: 0.7 };
  }
  if (desc.includes("grocery") || desc.includes("market") || desc.includes("supermarket")) {
    return { category: "Groceries", confidence: 0.7 };
  }
  if (desc.includes("gas") || desc.includes("fuel") || desc.includes("parking") || desc.includes("uber") || desc.includes("lyft")) {
    return { category: "Transportation", confidence: 0.7 };
  }
  if (desc.includes("store") || desc.includes("shop") || desc.includes("retail")) {
    return { category: "Shopping", confidence: 0.6 };
  }
  if (desc.includes("movie") || desc.includes("theater") || desc.includes("game") || desc.includes("entertainment")) {
    return { category: "Entertainment", confidence: 0.7 };
  }
  if (desc.includes("pharmacy") || desc.includes("doctor") || desc.includes("hospital") || desc.includes("gym")) {
    return { category: "Health", confidence: 0.7 };
  }
  if (desc.includes("electric") || desc.includes("water") || desc.includes("internet") || desc.includes("phone") || desc.includes("utility")) {
    return { category: "Utilities", confidence: 0.7 };
  }
  if (desc.includes("hotel") || desc.includes("flight") || desc.includes("travel") || desc.includes("airline")) {
    return { category: "Travel", confidence: 0.7 };
  }

  return { category: "Other", confidence: 0.5 };
}

async function categorizeWithClaude(input: CategorizationRequest): Promise<CategorizationResult> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const context = [
    `Transaction description: ${input.description}`,
    input.merchant_name ? `Merchant: ${input.merchant_name}` : "",
    input.amount ? `Amount: $${input.amount}` : "",
    input.location_type ? `Location type: ${input.location_type}` : "",
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      temperature: 0.1,
      system: `Categorize a transaction. Return ONLY JSON:
{
  "category": "Dining | Groceries | Transportation | Shopping | Entertainment | Health | Utilities | Travel | Other",
  "confidence": 0.0,
  "merchant_normalized": "clean merchant name"
}`,
      messages: [{ role: "user", content: context }],
    }),
  });

  if (!response.ok) throw new Error(`Claude categorization failed: ${response.status}`);
  const data = await response.json();
  const text = data.content?.find((part: { type: string }) => part.type === "text")?.text;
  if (!text) throw new Error("Claude returned no text");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude response did not include JSON");
  return JSON.parse(jsonMatch[0]) as CategorizationResult;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const correlationId = req.headers.get("x-correlation-id") || requestId;
  console.log(`🤖 [${requestId}] AI categorization request`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized", correlationId },
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input: CategorizationRequest = await req.json();
    if (!input.description) {
      return new Response(JSON.stringify({
        ok: false,
        error: { code: "MISSING_DESCRIPTION", message: "Description is required", correlationId },
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: featureFlag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("flag_name", "ai_categorization_enabled")
      .maybeSingle();

    const aiEnabled = featureFlag?.enabled !== false;
    let usedFallback = false;
    let result: CategorizationResult;

    if (aiEnabled && ANTHROPIC_API_KEY) {
      try {
        result = await categorizeWithClaude(input);
      } catch (aiError) {
        console.warn(`[${correlationId}] Claude categorization failed, using fallback`, aiError);
        const fallback = fallbackCategorize(input.description);
        result = {
          category: fallback.category,
          confidence: fallback.confidence,
          merchant_normalized: input.merchant_name || input.description,
        };
        usedFallback = true;
      }
    } else {
      const fallback = fallbackCategorize(input.description);
      result = {
        category: fallback.category,
        confidence: fallback.confidence,
        merchant_normalized: input.merchant_name || input.description,
      };
      usedFallback = true;
    }

    await supabase.from("api_request_log").insert({
      user_id: user.id,
      endpoint: "ai-categorize-transaction",
      method: "POST",
      status_code: 200,
      cache_hit: usedFallback,
    });

    return new Response(JSON.stringify({
      ok: true,
      data: { ...result, original_description: input.description, used_fallback: usedFallback },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    return new Response(JSON.stringify({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        correlationId,
      },
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
