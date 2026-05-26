import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse, handleCors, jsonResponse, parseJson, requireAdmin, safeError } from "../_shared/source-truth.ts";

const schema = z.object({
  review_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { user, service } = await requireAdmin(req);
    const input = schema.parse(await parseJson(req));

    const { data: review, error: reviewError } = await service
      .from("catalog_update_reviews")
      .select("*")
      .eq("id", input.review_id)
      .maybeSingle();

    if (reviewError) throw reviewError;
    if (!review) return errorResponse(req, "Review not found", 404);
    if (review.status !== "proposed") return errorResponse(req, "Review already resolved", 409);

    if (input.action === "approve") {
      const newData = review.new_data as Record<string, any>;
      if (newData.card && review.card_catalog_id) {
        const { error } = await service
          .from("card_catalog")
          .update({ ...newData.card, updated_at: new Date().toISOString() })
          .eq("id", review.card_catalog_id);
        if (error) throw error;
      }

      if (Array.isArray(newData.reward_rules)) {
        for (const rule of newData.reward_rules) {
          if (rule.id) {
            const { error } = await service
              .from("card_reward_rules")
              .update({ ...rule, updated_at: new Date().toISOString() })
              .eq("id", rule.id);
            if (error) throw error;
          } else {
            const { error } = await service
              .from("card_reward_rules")
              .insert({ ...rule, card_catalog_id: review.card_catalog_id });
            if (error) throw error;
          }
        }
      }
    }

    const { data: updated, error: updateError } = await service
      .from("catalog_update_reviews")
      .update({
        status: input.action === "approve" ? "approved" : "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.review_id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return jsonResponse(req, { review: updated });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
