/**
 * catalog-extract-card-rewards
 *
 * Admin-only Edge Function that pulls the latest reward structure from an
 * official issuer page using Claude, then writes proposed rows into
 * card_reward_rules and card_signup_bonuses for human review.
 *
 * This function never overwrites verified rules directly. It always produces
 * `status = 'proposed'` rows and a catalog_update_reviews entry so that the
 * existing admin-catalog-review-update flow can approve them.
 *
 * Body:
 *   { card_catalog_id: uuid, page_url?: string, terms_url?: string, mode?: "extract" | "refresh" }
 *
 * @requires npm:@anthropic-ai/sdk@0.27.0
 * @requires _shared/fetch-page-content.ts
 * @requires _shared/diff-reward-rules.ts
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.27.0";

import {
  errorResponse,
  handleCors,
  jsonResponse,
  parseJson,
  requireAdmin,
  safeError,
  HttpError,
} from "../_shared/source-truth.ts";
import { fetchPageContent } from "../_shared/fetch-page-content.ts";
import {
  diffRewardRules,
  type ExtractedRule,
  type ExtractionSnapshot,
  type RuleChange,
} from "../_shared/diff-reward-rules.ts";

const MODEL = Deno.env.get("ANTHROPIC_MODEL_CATALOG") ?? "claude-sonnet-4-5";
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 30_000;
const RETRY_COUNT = 1;

const BodySchema = z.object({
  card_catalog_id: z.string().uuid(),
  page_url: z.string().url().optional(),
  terms_url: z.string().url().optional(),
  mode: z.enum(["extract", "refresh"]).optional().default("extract"),
});

interface ExtractionPayload extends ExtractionSnapshot {
  annual_fee_cents: number | null;
  reward_rules: ExtractedRule[];
  signup_bonus: ExtractionSnapshot["signup_bonus"];
  extraction_confidence: number;
  extraction_notes?: string;
}

const SYSTEM_PROMPT =
  "You are a financial data extraction assistant. Your job is to extract credit card reward structures from official issuer pages with 100% accuracy. Return ONLY valid JSON with no commentary, no markdown fences, no explanation. If you are uncertain about a value, use null rather than guessing. Extract from the actual page content only — do not use prior knowledge.";

function buildUserPrompt(args: { cardName: string; pageUrl: string; pageContent: string }): string {
  return `Extract the complete reward structure from this credit card page.

Card: ${args.cardName}
Source URL: ${args.pageUrl}

Return this exact JSON structure:
{
  "annual_fee_cents": number | null,
  "reward_rules": [
    {
      "category": "dining|groceries|travel|gas|streaming|transit|entertainment|online_shopping|other",
      "reward_rate": number,
      "reward_unit": "points_per_dollar|cashback_percent|miles_per_dollar",
      "applies_to": "description of what qualifies",
      "cap_amount_cents": number | null,
      "cap_period": "yearly|monthly|null",
      "is_base_rate": boolean,
      "notes": "any important conditions or exclusions"
    }
  ],
  "signup_bonus": {
    "description": "full bonus description as stated",
    "estimated_value_cents": number | null,
    "spend_requirement_cents": number | null,
    "window_days": number | null
  } | null,
  "extraction_confidence": 0.0 to 1.0,
  "extraction_notes": "anything uncertain or ambiguous found during extraction"
}

Page content:
${args.pageContent}`;
}

function parseJsonLoose(raw: string): ExtractionPayload {
  // Defensive: Claude is instructed to return raw JSON but occasionally wraps
  // it in markdown. Strip a leading code fence if present.
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Extraction result was not a JSON object");
  }
  if (!Array.isArray(parsed.reward_rules)) {
    parsed.reward_rules = [];
  }
  // Normalize cashback_percent -> percent for our schema.
  parsed.reward_rules = parsed.reward_rules.map((rule: Record<string, unknown>) => {
    const unit = String(rule.reward_unit ?? "percent");
    return {
      ...rule,
      reward_unit:
        unit === "cashback_percent" ? "percent" :
        unit === "points_per_dollar" ? "points_per_dollar" :
        unit === "miles_per_dollar" ? "miles_per_dollar" : "percent",
    };
  });
  if (typeof parsed.extraction_confidence !== "number") {
    parsed.extraction_confidence = 0.7;
  }
  return parsed as ExtractionPayload;
}

async function callClaude(args: {
  apiKey: string;
  cardName: string;
  pageUrl: string;
  pageContent: string;
}): Promise<ExtractionPayload> {
  const client = new Anthropic({ apiKey: args.apiKey });
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const message = await client.messages.create(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: buildUserPrompt({
                cardName: args.cardName,
                pageUrl: args.pageUrl,
                pageContent: args.pageContent,
              }),
            },
          ],
        },
        { signal: controller.signal },
      );
      clearTimeout(timer);

      const textBlock = message.content.find((b: { type: string }) => b.type === "text") as
        | { type: "text"; text: string }
        | undefined;
      if (!textBlock?.text) {
        throw new Error("Claude returned no text content");
      }
      return parseJsonLoose(textBlock.text);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Claude extraction failed";
  throw new HttpError(message, 502);
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return errorResponse(req, "ANTHROPIC_API_KEY not configured", 503);

    const { user, service } = await requireAdmin(req);
    const body = BodySchema.parse(await parseJson(req));

    const { data: card, error: cardError } = await service
      .from("card_catalog")
      .select(
        "id, card_name, issuer, annual_fee_cents, official_product_url, official_terms_url, verification_status",
      )
      .eq("id", body.card_catalog_id)
      .maybeSingle();

    if (cardError) throw cardError;
    if (!card) return errorResponse(req, "Card not found", 404);

    const pageUrl = body.page_url ?? card.official_product_url ?? card.official_terms_url;
    if (!pageUrl) return errorResponse(req, "No official URL configured for this card", 400);

    const page = await fetchPageContent(pageUrl);
    if (page.error || !page.content) {
      await service
        .from("card_catalog")
        .update({
          last_checked_at: page.fetched_at,
          last_extraction_status: "fetch_failed",
          last_extraction_error: page.error ?? `HTTP ${page.status}`,
        })
        .eq("id", card.id);
      return errorResponse(req, `Page fetch failed: ${page.error ?? `HTTP ${page.status}`}`, 502, {
        url: pageUrl,
      });
    }

    const extraction = await callClaude({
      apiKey,
      cardName: card.card_name,
      pageUrl,
      pageContent: page.content,
    });

    // 1. Persist proposed reward rules. Each one is keyed (card, category,
    //    merchant_scope, valid_from) by the source-of-truth unique index, so
    //    re-extraction updates the same row instead of duplicating.
    const proposedRules: ExtractedRule[] = (extraction.reward_rules ?? []).map((rule) => ({
      ...rule,
      source_url: pageUrl,
    }));

    for (const rule of proposedRules) {
      const { error } = await service
        .from("card_reward_rules")
        .upsert(
          {
            card_catalog_id: card.id,
            category: rule.category,
            reward_rate: rule.reward_rate,
            reward_unit: rule.reward_unit,
            applies_to: rule.applies_to ?? null,
            merchant_scope: "all",
            cap_amount_cents: rule.cap_amount_cents ?? null,
            cap_period: rule.cap_period ?? null,
            source_url: pageUrl,
            confidence_score: Math.round((extraction.extraction_confidence ?? 0.7) * 100) / 100,
            status: "proposed",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "card_catalog_id,category,merchant_scope,valid_from" },
        );
      if (error) throw error;
    }

    // 2. Persist signup bonus as proposed (one active bonus per extraction).
    if (extraction.signup_bonus) {
      const { error } = await service.from("card_signup_bonuses").insert({
        card_catalog_id: card.id,
        bonus_description: extraction.signup_bonus.description,
        bonus_value_cents: extraction.signup_bonus.estimated_value_cents ?? null,
        spend_requirement_cents: extraction.signup_bonus.spend_requirement_cents ?? null,
        window_days: extraction.signup_bonus.window_days ?? null,
        source_url: pageUrl,
        extracted_by: "claude",
        status: "proposed",
      });
      if (error) throw error;
    }

    // 3. Build a diff vs the previously verified snapshot and write a single
    //    catalog_update_reviews entry per change. Dedupe against existing
    //    pending reviews for the same field+card so cron re-runs are safe.
    const { data: oldRules } = await service
      .from("card_reward_rules")
      .select("category, reward_rate, reward_unit, applies_to, cap_amount_cents, cap_period")
      .eq("card_catalog_id", card.id)
      .eq("status", "verified");

    const oldSnapshot: ExtractionSnapshot = {
      annual_fee_cents: card.annual_fee_cents ?? null,
      reward_rules: (oldRules ?? []) as ExtractedRule[],
      signup_bonus: null,
      extraction_confidence: 1,
    };

    const newSnapshot: ExtractionSnapshot = {
      annual_fee_cents: extraction.annual_fee_cents ?? null,
      reward_rules: proposedRules,
      signup_bonus: extraction.signup_bonus ?? null,
      extraction_confidence: extraction.extraction_confidence,
    };

    const changes: RuleChange[] = diffRewardRules(oldSnapshot, newSnapshot);

    let writtenChanges = 0;
    for (const change of changes) {
      const { data: existing } = await service
        .from("catalog_update_reviews")
        .select("id")
        .eq("card_catalog_id", card.id)
        .eq("status", "proposed")
        .eq("change_type", change.change_type)
        .limit(1)
        .maybeSingle();
      if (existing?.id) continue;
      const { error } = await service.from("catalog_update_reviews").insert({
        card_catalog_id: card.id,
        change_type: change.change_type,
        old_data: change.old_value as Record<string, unknown> | null,
        new_data: { ...(change.new_value as object | null ?? {}), field_changed: change.field_changed },
        source_url: change.source_url ?? pageUrl,
        detected_by: "ai_agent",
        status: "proposed",
      });
      if (error) throw error;
      writtenChanges += 1;
    }

    // 4. Update tracking columns on card_catalog.
    await service
      .from("card_catalog")
      .update({
        annual_fee_cents: extraction.annual_fee_cents ?? card.annual_fee_cents ?? 0,
        last_checked_at: page.fetched_at,
        last_extraction_status: writtenChanges > 0 ? "changes_detected" : "no_changes",
        last_extraction_error: null,
        last_extraction_confidence: extraction.extraction_confidence,
        pending_change_count: writtenChanges,
        verification_status: card.verification_status === "verified" && writtenChanges > 0
          ? "needs_review"
          : card.verification_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id);

    return jsonResponse(req, {
      card_id: card.id,
      mode: body.mode,
      page_status: page.status,
      page_chars: page.content_chars,
      extraction_confidence: extraction.extraction_confidence,
      proposed_rule_count: proposedRules.length,
      change_count: writtenChanges,
      changes,
      extraction_notes: extraction.extraction_notes ?? null,
      reviewed_by: user.id,
    });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
