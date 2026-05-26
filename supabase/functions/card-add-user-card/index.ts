import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse, handleCors, jsonResponse, parseJson, requireUser, safeError } from "../_shared/source-truth.ts";

const schema = z.object({
  card_catalog_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(120).optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { client, user } = await requireUser(req);
    const input = schema.parse(await parseJson(req));

    const { data: catalogCard, error: cardError } = await client
      .from("card_catalog")
      .select("id, issuer, card_name, network")
      .eq("id", input.card_catalog_id)
      .eq("is_active", true)
      .maybeSingle();

    if (cardError) throw cardError;
    if (!catalogCard) return errorResponse(req, "Card not found", 404);

    const { data: created, error: insertError } = await client
      .from("user_credit_cards")
      .insert({
        user_id: user.id,
        card_catalog_id: input.card_catalog_id,
        display_name: input.display_name ?? catalogCard.card_name,
        issuer: catalogCard.issuer,
        network: catalogCard.network,
        last4: input.last4 ?? null,
      })
      .select(`
        id,
        display_name,
        issuer,
        network,
        last4,
        rewards_confirmed_by_user,
        card_catalog:card_catalog_id (
          id,
          card_name,
          card_reward_rules (
            id,
            category,
            reward_rate,
            reward_unit,
            cap_amount_cents,
            cap_period,
            requires_activation,
            status
          )
        )
      `)
      .single();

    if (insertError) throw insertError;
    return jsonResponse(req, { card: created }, 201);
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
