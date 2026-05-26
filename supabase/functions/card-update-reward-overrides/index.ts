import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse, handleCors, jsonResponse, parseJson, requireUser, safeError } from "../_shared/source-truth.ts";

const rewardUnit = z.enum(["percent", "points_per_dollar", "miles_per_dollar"]);

const schema = z.object({
  user_credit_card_id: z.string().uuid(),
  overrides: z.array(z.object({
    category: z.string().trim().min(1).max(60),
    reward_rate: z.number().min(0).max(100),
    reward_unit: rewardUnit,
    applies_to: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(500).optional(),
  })).min(1).max(20),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { client, user } = await requireUser(req);
    const input = schema.parse(await parseJson(req));

    const { data: card, error: cardError } = await client
      .from("user_credit_cards")
      .select("id")
      .eq("id", input.user_credit_card_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (cardError) throw cardError;
    if (!card) return errorResponse(req, "Card not found", 404);

    const rows = input.overrides.map((override) => ({
      user_id: user.id,
      user_credit_card_id: input.user_credit_card_id,
      category: override.category,
      reward_rate: override.reward_rate,
      reward_unit: override.reward_unit,
      applies_to: override.applies_to ?? null,
      notes: override.notes ?? null,
    }));

    const { data: overrides, error: upsertError } = await client
      .from("user_card_reward_overrides")
      .upsert(rows, { onConflict: "user_credit_card_id,category" })
      .select("*");

    if (upsertError) throw upsertError;

    const { error: updateError } = await client
      .from("user_credit_cards")
      .update({ rewards_confirmed_by_user: true, updated_at: new Date().toISOString() })
      .eq("id", input.user_credit_card_id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    return jsonResponse(req, { overrides: overrides ?? [] });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
