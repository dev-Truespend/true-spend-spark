/**
 * admin-catalog-rule-update
 *
 * Admin-only Edge Function for approving or rejecting a single proposed
 * reward rule. Complements admin-catalog-review-update (which handles bundled
 * catalog_update_reviews) by giving operators a per-row control.
 *
 * Body:
 *   { rule_id: uuid, action: "approve" | "reject", reason?: string }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import {
  errorResponse,
  handleCors,
  jsonResponse,
  parseJson,
  requireAdmin,
  safeError,
} from "../_shared/source-truth.ts";

const BodySchema = z.object({
  rule_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { user, service } = await requireAdmin(req);
    const input = BodySchema.parse(await parseJson(req));

    const { data: rule, error: ruleError } = await service
      .from("card_reward_rules")
      .select("id, card_catalog_id, status")
      .eq("id", input.rule_id)
      .maybeSingle();

    if (ruleError) throw ruleError;
    if (!rule) return errorResponse(req, "Rule not found", 404);

    const nextStatus = input.action === "approve" ? "verified" : "retired";

    const { data: updated, error: updateError } = await service
      .from("card_reward_rules")
      .update({
        status: nextStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: input.action === "reject" ? input.reason ?? null : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.rule_id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    // Recompute pending change count for the parent card so the admin list
    // badge reflects reality.
    const { count } = await service
      .from("catalog_update_reviews")
      .select("id", { count: "exact", head: true })
      .eq("card_catalog_id", rule.card_catalog_id)
      .eq("status", "proposed");

    await service
      .from("card_catalog")
      .update({ pending_change_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", rule.card_catalog_id);

    return jsonResponse(req, { rule: updated, pending_change_count: count ?? 0 });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
