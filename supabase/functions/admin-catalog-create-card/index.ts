import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse, handleCors, jsonResponse, parseJson, requireAdmin, safeError } from "../_shared/source-truth.ts";

const rewardRuleSchema = z.object({
  category: z.string().trim().min(1).max(60),
  reward_rate: z.number().min(0).max(100),
  reward_unit: z.enum(["percent", "points_per_dollar", "miles_per_dollar"]),
  applies_to: z.string().trim().max(160).optional(),
  merchant_scope: z.string().trim().max(80).default("all"),
  cap_amount_cents: z.number().int().min(0).nullable().optional(),
  cap_period: z.enum(["monthly", "quarterly", "yearly", "lifetime", "none"]).nullable().optional(),
  after_cap_rate: z.number().min(0).max(100).nullable().optional(),
  requires_activation: z.boolean().default(false),
  source_url: z.string().url(),
  status: z.enum(["draft", "proposed", "verified", "needs_review", "retired"]).default("needs_review"),
});

const schema = z.object({
  card: z.object({
    issuer: z.string().trim().min(1).max(120),
    card_name: z.string().trim().min(1).max(160),
    card_slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9-]+$/),
    network: z.enum(["visa", "mastercard", "amex", "discover", "other"]).nullable().optional(),
    card_type: z.enum(["personal", "business"]).default("personal"),
    rewards_currency: z.enum(["cashback", "points", "miles", "none"]).nullable().optional(),
    rewards_program: z.string().trim().max(120).nullable().optional(),
    annual_fee_cents: z.number().int().min(0).default(0),
    base_reward_rate: z.number().min(0).max(100).default(1),
    base_reward_unit: z.enum(["percent", "points_per_dollar", "miles_per_dollar"]).default("percent"),
    official_product_url: z.string().url().nullable().optional(),
    official_terms_url: z.string().url().nullable().optional(),
    verification_status: z.enum(["unverified", "needs_review", "verified", "deprecated"]).default("needs_review"),
  }),
  reward_rules: z.array(rewardRuleSchema).min(1).max(30),
  source_url: z.string().url().optional(),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { user, service } = await requireAdmin(req);
    const input = schema.parse(await parseJson(req));

    const { data: card, error: cardError } = await service
      .from("card_catalog")
      .insert(input.card)
      .select("*")
      .single();

    if (cardError) throw cardError;

    const rules = input.reward_rules.map((rule) => ({
      ...rule,
      card_catalog_id: card.id,
      confidence_score: 0.9,
    }));

    const { data: createdRules, error: rulesError } = await service
      .from("card_reward_rules")
      .insert(rules)
      .select("*");

    if (rulesError) throw rulesError;

    await service.from("catalog_update_reviews").insert({
      card_catalog_id: card.id,
      change_type: "card_created",
      old_data: null,
      new_data: { card, reward_rules: createdRules ?? [] },
      source_url: input.source_url ?? input.card.official_terms_url ?? input.card.official_product_url ?? null,
      detected_by: "admin",
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });

    return jsonResponse(req, { card, reward_rules: createdRules ?? [] }, 201);
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
