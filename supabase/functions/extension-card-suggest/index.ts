import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import {
  errorResponse,
  getServiceClient,
  handleCors,
  jsonResponse,
  normalizeDomain,
  parseJson,
  rankUserCards,
  requireUser,
  resolveMerchant,
  safeError,
} from "../_shared/source-truth.ts";

const schema = z.object({
  domain: z.string().trim().min(3).max(255),
  url_path: z.string().trim().max(300).optional(),
  page_title: z.string().trim().max(200).optional(),
  page_intent: z.string().trim().max(40).optional(),
  amount_cents: z.number().int().min(1).max(10_000_000).nullable().optional(),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { client, user } = await requireUser(req);
    const input = schema.parse(await parseJson(req));
    const service = getServiceClient();
    const domain = normalizeDomain(input.domain);
    const merchantResult = await resolveMerchant(service, domain);
    const amountCents = input.amount_cents ?? 5000;
    const merchant = merchantResult.merchant;
    const rankedCards = await rankUserCards(client, user.id, merchant.normalized_category, amountCents);

    await service
      .from("extension_events")
      .insert({
        user_id: user.id,
        domain,
        merchant_name: merchant.merchant_name,
        normalized_category: merchant.normalized_category,
        event_type: "suggestion_requested",
        metadata: {
          page_intent: input.page_intent ?? null,
          amount_cents: amountCents,
          merchant_status: merchantResult.status,
          // Intentionally no full URL.
        },
      });

    const best = rankedCards[0] ?? null;
    return jsonResponse(req, {
      status: "success",
      merchant: {
        domain,
        merchant_name: merchant.merchant_name,
        normalized_category: merchant.normalized_category,
        confidence_score: merchant.confidence_score,
      },
      recommendation: {
        best_card: best ? {
          user_credit_card_id: best.user_credit_card_id,
          card_name: best.card_name,
          reward_rate_label: best.reward_label,
          estimated_value_label: `${best.estimated_value_label} on a $${(amountCents / 100).toFixed(0)} purchase`,
          estimated_value_cents: best.estimated_value_cents,
        } : null,
        alternatives: rankedCards.slice(1, 4).map((card: any) => ({
          card_name: card.card_name,
          reward_rate_label: card.reward_label,
          estimated_value_label: card.estimated_value_label,
        })),
        why: best
          ? `${merchant.merchant_name} is categorized as ${merchant.normalized_category}. ${best.card_name} has the highest deterministic reward value in your portfolio for this category.`
          : "Add at least one credit card to get a recommendation.",
      },
    });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
