/**
 * card-feedback
 *
 * Public endpoint for authenticated users to report incorrect / outdated /
 * special-offer information about a card or reward rule. Inserts into
 * card_user_feedback for admin triage.
 *
 * Body:
 *   { card_catalog_id?: uuid, card_reward_rule_id?: uuid,
 *     feedback_type: "correct"|"incorrect"|"outdated"|"special_offer"|"other",
 *     note?: string }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import {
  errorResponse,
  handleCors,
  jsonResponse,
  parseJson,
  requireUser,
  safeError,
} from "../_shared/source-truth.ts";

const BodySchema = z
  .object({
    card_catalog_id: z.string().uuid().optional(),
    card_reward_rule_id: z.string().uuid().optional(),
    feedback_type: z.enum(["correct", "incorrect", "outdated", "special_offer", "other"]),
    note: z.string().max(2000).optional(),
  })
  .refine((value) => Boolean(value.card_catalog_id || value.card_reward_rule_id), {
    message: "card_catalog_id or card_reward_rule_id is required",
  });

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { client, user } = await requireUser(req);
    const input = BodySchema.parse(await parseJson(req));

    // If only a rule id is given, look up the parent card to keep the audit
    // trail joinable.
    let card_catalog_id = input.card_catalog_id ?? null;
    if (!card_catalog_id && input.card_reward_rule_id) {
      const { data: rule } = await client
        .from("card_reward_rules")
        .select("card_catalog_id")
        .eq("id", input.card_reward_rule_id)
        .maybeSingle();
      card_catalog_id = (rule?.card_catalog_id as string | undefined) ?? null;
    }

    const { data, error } = await client
      .from("card_user_feedback")
      .insert({
        user_id: user.id,
        card_catalog_id,
        card_reward_rule_id: input.card_reward_rule_id ?? null,
        feedback_type: input.feedback_type,
        note: input.note ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) throw error;
    return jsonResponse(req, { feedback_id: data.id, created_at: data.created_at }, 201);
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
