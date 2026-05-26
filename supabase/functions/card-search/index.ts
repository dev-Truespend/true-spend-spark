import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse, handleCors, jsonResponse, parseJson, requireUser, safeError } from "../_shared/source-truth.ts";

const schema = z.object({
  query: z.string().trim().min(1).max(80),
});

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);
    const { client } = await requireUser(req);
    const input = schema.parse(await parseJson(req));
    const search = `%${input.query}%`;

    const { data, error } = await client
      .from("card_catalog")
      .select(`
        id,
        card_name,
        issuer,
        card_slug,
        annual_fee_cents,
        verification_status,
        card_reward_rules (
          category,
          reward_rate,
          reward_unit,
          status
        )
      `)
      .eq("is_active", true)
      .or(`card_name.ilike.${search},issuer.ilike.${search},card_slug.ilike.${search}`)
      .limit(10);

    if (error) throw error;

    const cards = (data ?? []).map((card: any) => ({
      id: card.id,
      card_name: card.card_name,
      issuer: card.issuer,
      annual_fee_cents: card.annual_fee_cents ?? 0,
      verification_status: card.verification_status,
      top_rewards: (card.card_reward_rules ?? [])
        .filter((rule: any) => ["verified", "needs_review"].includes(rule.status))
        .slice(0, 4)
        .map((rule: any) => {
          const rate = Number(rule.reward_rate);
          const rateLabel = Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
          return `${rateLabel}${rule.reward_unit === "percent" ? "%" : "x"} ${rule.category}`;
        }),
    }));

    return jsonResponse(req, { cards });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
