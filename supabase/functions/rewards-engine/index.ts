import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse, handleCors, jsonResponse, parseJson, rankUserCards, requireUser, safeError } from "../_shared/source-truth.ts";

const schema = z.object({
  merchant_name: z.string().trim().min(1).max(160),
  domain: z.string().trim().min(3).max(255).optional(),
  normalized_category: z.string().trim().min(1).max(60),
  amount_cents: z.number().int().min(1).max(10_000_000).default(5000),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { client, user } = await requireUser(req);
    const input = schema.parse(await parseJson(req));

    const rankedCards = await rankUserCards(client, user.id, input.normalized_category, input.amount_cents);
    if (!rankedCards.length) {
      return jsonResponse(req, {
        merchant: input.merchant_name,
        category: input.normalized_category,
        amount_cents: input.amount_cents,
        best_card: null,
        alternatives: [],
        confidence_score: 0,
        reason_codes: ["no_user_cards"],
      });
    }

    const best = rankedCards[0];
    const confidence = best.source === "catalog_rule" || best.source === "user_override" ? 0.92 : 0.65;

    return jsonResponse(req, {
      merchant: input.merchant_name,
      category: input.normalized_category,
      amount_cents: input.amount_cents,
      best_card: best,
      alternatives: rankedCards.slice(1, 4),
      confidence_score: confidence,
      reason_codes: [
        best.source === "user_override" ? "user_override_match" : best.source === "catalog_rule" ? "verified_or_seeded_reward_rule" : "base_rate_fallback",
        "deterministic_reward_math",
      ],
    });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
