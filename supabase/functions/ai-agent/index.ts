/**
 * @function ai-agent
 * @description TrueSpend's single AI intelligence hub. Uses Claude with tool use
 *   to analyze spending, recommend the best card for any purchase, calculate missed rewards,
 *   suggest new cards to apply for, detect anomalies, and answer freeform financial questions.
 * @trigger HTTP POST — authenticated
 * @auth Required — validates Supabase JWT
 * @input { intent: string, payload?: object }
 * @output { response: string, data?: object, intent: string }
 * @calls anthropic, supabase DB
 * @sideEffects writes to: ai_recommendations (when save_recommendation tool is called)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.27.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL_AGENT = Deno.env.get("ANTHROPIC_MODEL_AGENT") || "claude-sonnet-4-6";
const MODEL_FAST = Deno.env.get("ANTHROPIC_MODEL_FAST") || "claude-haiku-4-5-20251001";
const AI_AGENT_RPM_PER_USER = Number(Deno.env.get("AI_AGENT_RPM_PER_USER") || 12);
const AI_AGENT_CACHE_TTL_SECONDS = Number(Deno.env.get("AI_AGENT_CACHE_TTL_SECONDS") || 3600);
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const CACHEABLE_INTENTS = new Set([
  "analyze_spending",
  "missed_rewards",
  "apply_recommendations",
  "anomaly_check",
]);

type SupabaseClient = ReturnType<typeof createClient>;

function modelForIntent(intent: string): string {
  return intent === "chat" || intent === "apply_recommendations" ? MODEL_AGENT : MODEL_FAST;
}

function maxTokensForIntent(intent: string): number {
  if (intent === "chat") return 1200;
  if (intent === "apply_recommendations") return 1600;
  return 900;
}

function daysForPeriod(period: unknown): number {
  if (period === "week") return 7;
  if (period === "quarter") return 90;
  return 30;
}

function stablePayload(payload: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(payload).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = payload[key];
    return acc;
  }, {}));
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isRateLimitError(error: unknown): boolean {
  const maybe = error as { status?: number; message?: string };
  return maybe?.status === 429 || maybe?.message?.toLowerCase().includes("rate limit") === true;
}

function getAdminClient(): SupabaseClient | null {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function checkUserRateLimit(admin: SupabaseClient | null, userId: string, intent: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  if (!admin || !AI_AGENT_RPM_PER_USER || AI_AGENT_RPM_PER_USER < 1) return { allowed: true };

  const windowSizeSeconds = 60;
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSizeSeconds * 1000)) * windowSizeSeconds * 1000).toISOString();
  const endpoint = `ai-agent:${intent}`;

  const { data: existing } = await admin
    .from("rate_limits")
    .select("id, request_count")
    .eq("identifier", userId)
    .eq("endpoint", endpoint)
    .eq("window_start", windowStart)
    .eq("window_size_seconds", windowSizeSeconds)
    .maybeSingle();

  const nextCount = ((existing as { request_count?: number } | null)?.request_count ?? 0) + 1;
  if (nextCount > AI_AGENT_RPM_PER_USER) {
    return { allowed: false, retryAfterSeconds: windowSizeSeconds - now.getSeconds() };
  }

  const existingId = (existing as { id?: string } | null)?.id;
  await admin.from("rate_limits").upsert({
    ...(existingId ? { id: existingId } : {}),
    identifier: userId,
    endpoint,
    request_count: nextCount,
    window_start: windowStart,
    window_size_seconds: windowSizeSeconds,
  }, { onConflict: "identifier,endpoint,window_start" });

  return { allowed: true };
}

// ── TOOL DEFINITIONS ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_user_cards_with_rewards",
    description:
      "Fetch all active credit cards for the current user, including their rewards rates per spending category. Returns card name, network, annual fee, base rate, and category-specific multipliers. Always call this before making any card recommendation.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_transactions",
    description:
      "Fetch the user's transactions for a given time period. Returns merchant name, category, amount, timestamp, and which card was used. Use for spending analysis, pattern detection, and missed rewards calculation.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days back to fetch (7, 30, or 90)" },
        category: { type: "string", description: "Optional: filter by spending category" },
        limit: { type: "number", description: "Max transactions to return (default 100)" },
      },
      required: ["days"],
    },
  },
  {
    name: "get_best_card_for_purchase",
    description:
      "Given a spending category and optional amount, calculate which of the user's cards earns the most rewards. Returns ranked list of cards with expected rewards amount.",
    input_schema: {
      type: "object",
      properties: {
        merchant_category: {
          type: "string",
          enum: ["dining", "groceries", "travel", "gas", "streaming", "shopping", "entertainment", "health", "utilities", "transportation", "other"],
        },
        amount_cents: { type: "number", description: "Purchase amount in cents (e.g. 5000 = $50)" },
      },
      required: ["merchant_category"],
    },
  },
  {
    name: "calculate_missed_rewards",
    description:
      "For a given time period, calculate how much the user earned in rewards versus what they could have earned using their optimal card. Returns total missed amount and per-category breakdown.",
    input_schema: {
      type: "object",
      properties: {
        period_days: { type: "number", description: "30 or 90" },
      },
      required: ["period_days"],
    },
  },
  {
    name: "get_card_apply_recommendations",
    description:
      "Analyse the user's 90-day spending by category and compare against cards in the card catalog that the user does NOT currently have. Return top 3 cards that would earn the most additional rewards.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "detect_anomalies",
    description:
      "Scan recent transactions for: duplicate charges (same merchant + amount within 7 days), unusually large transactions vs historical average, and potential forgotten subscriptions.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Days to scan (default 30)" },
      },
      required: [],
    },
  },
  {
    name: "get_spending_summary",
    description:
      "Get a high-level summary: total spent by category, monthly trend (this month vs last month), average transaction size, and top merchants. Use for the analyze_spending intent.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "7, 30, or 90" },
      },
      required: ["days"],
    },
  },
  {
    name: "save_recommendation",
    description:
      "Persist an AI recommendation to the ai_recommendations table so it appears in the user's feed. Call this after generating a meaningful insight worth surfacing.",
    input_schema: {
      type: "object",
      properties: {
        recommendation_type: {
          type: "string",
          enum: ["best_card_now", "missed_rewards", "apply_suggestion", "spending_insight", "subscription_alert", "duplicate_charge"],
        },
        title: { type: "string" },
        body: { type: "string" },
        estimated_value_cents: { type: "number" },
        metadata: { type: "object" },
        credit_card_id: { type: "string" },
        catalog_card_id: { type: "string" },
      },
      required: ["recommendation_type", "title", "body"],
    },
  },
];

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are TrueSpend's financial co-pilot AI, powered by Claude. Your job is to help users maximize their credit card rewards on every purchase and identify opportunities they're missing.

Core principles:
1. Always be specific with numbers — say "you earned 3% back ($1.80)" not "you earned rewards"
2. When recommending a card, always show the math: card name, rate, expected earnings
3. When calculating missed rewards, show what card should have been used and the dollar difference
4. Keep responses concise — users read these on mobile. Use bullet points and bold for key numbers
5. Currency is USD. Show amounts as dollars (e.g. $3.20, not 320 cents)
6. Categories: dining, groceries, travel, gas, streaming, shopping, entertainment, health, utilities, transportation, other
7. Always lead with the most valuable insight first

Tool use order for best_card_now:
1. get_user_cards_with_rewards (always first)
2. get_best_card_for_purchase with the category/amount
3. Return clear recommendation with math

Tool use order for missed_rewards:
1. calculate_missed_rewards for the period
2. get_user_cards_with_rewards to show alternatives
3. Return: total missed, top 3 categories to fix, which card to use for each

Tool use order for analyze_spending:
1. get_spending_summary for the period
2. get_user_cards_with_rewards (to cross-reference rewards optimization)
3. Return: key trends, top categories, one actionable optimization tip

Tool use order for apply_recommendations:
1. get_card_apply_recommendations
2. Return top 2 cards with: projected annual earnings increase, signup bonus value, annual fee ROI

After generating a significant insight (missed rewards > $10, apply suggestion > $100/year), always call save_recommendation to persist it to the user's feed.`;

// ── TOOL IMPLEMENTATIONS ──────────────────────────────────────────────────────

interface AgentResult {
  response: string;
  data: unknown;
  intent: string;
  cached?: boolean;
  degraded?: boolean;
  model?: string;
}

async function getCachedAgentResult(
  supabase: SupabaseClient,
  userId: string,
  intent: string,
  payload: Record<string, unknown>
): Promise<AgentResult | null> {
  if (!CACHEABLE_INTENTS.has(intent)) return null;

  const payloadHash = await sha256Hex(stablePayload(payload));
  const { data, error } = await supabase
    .from("ai_agent_cache")
    .select("response")
    .eq("user_id", userId)
    .eq("intent", intent)
    .eq("payload_hash", payloadHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.warn("[ai-agent] cache read skipped:", error.message);
    return null;
  }

  const cached = (data as { response?: AgentResult } | null)?.response;
  return cached ? { ...cached, cached: true } : null;
}

async function saveCachedAgentResult(
  supabase: SupabaseClient,
  userId: string,
  intent: string,
  payload: Record<string, unknown>,
  result: AgentResult
): Promise<void> {
  if (!CACHEABLE_INTENTS.has(intent)) return;

  const payloadHash = await sha256Hex(stablePayload(payload));
  const expiresAt = new Date(Date.now() + AI_AGENT_CACHE_TTL_SECONDS * 1000).toISOString();
  const { error } = await supabase.from("ai_agent_cache").upsert({
    user_id: userId,
    intent,
    payload_hash: payloadHash,
    response: { ...result, cached: false },
    expires_at: expiresAt,
  }, { onConflict: "user_id,intent,payload_hash" });

  if (error) {
    console.warn("[ai-agent] cache write skipped:", error.message);
  }
}

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<unknown> {
  switch (toolName) {
    case "get_user_cards_with_rewards": {
      const { data: cards, error } = await supabase
        .from("credit_cards")
        .select(`
          id, card_product_name, card_network, rewards_type,
          points_program, annual_fee, base_rewards_rate,
          account_name, account_mask, current_balance,
          card_rewards_categories (
            category, rewards_rate, rewards_cap_monthly, is_rotating_category,
            rotating_valid_from, rotating_valid_until
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true);
      if (error) throw new Error(`Cards query failed: ${error.message}`);
      return cards ?? [];
    }

    case "get_transactions": {
      const days = (toolInput.days as number) || 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      let query = supabase
        .from("transactions")
        .select("id, description, amount, category, merchant_category, timestamp, credit_card_id, rewards_earned_cents")
        .eq("user_id", userId)
        .gte("timestamp", since)
        .order("timestamp", { ascending: false })
        .limit((toolInput.limit as number) || 100);
      if (toolInput.category) query = query.eq("category", toolInput.category as string);
      const { data, error } = await query;
      if (error) throw new Error(`Transactions query failed: ${error.message}`);
      return data ?? [];
    }

    case "get_best_card_for_purchase": {
      const category = (toolInput.merchant_category as string).toLowerCase();
      const amountCents = (toolInput.amount_cents as number) || 5000;

      const { data: cards, error } = await supabase
        .from("credit_cards")
        .select(`
          id, card_product_name, base_rewards_rate, account_name, account_mask,
          card_rewards_categories (category, rewards_rate, is_rotating_category, rotating_valid_until)
        `)
        .eq("user_id", userId)
        .eq("is_active", true);
      if (error) throw new Error(`Cards query failed: ${error.message}`);
      if (!cards?.length) return { error: "No cards connected. Add a card in the Credit Cards section." };

      const now = new Date();
      const ranked = (cards as Array<Record<string, unknown>>).map((card) => {
        const rewards = (card.card_rewards_categories as Array<{ category: string; rewards_rate: number; is_rotating_category: boolean; rotating_valid_until?: string }>) ?? [];
        // Find best matching rate: exact category, then rotating (if still active), then base
        let rate = (card.base_rewards_rate as number) || 1.0;
        for (const r of rewards) {
          if (r.category === category) { rate = r.rewards_rate; break; }
          if (r.category === "rotating" && r.is_rotating_category) {
            const expiry = r.rotating_valid_until ? new Date(r.rotating_valid_until) : null;
            if (!expiry || expiry > now) rate = Math.max(rate, r.rewards_rate);
          }
        }
        const earnedCents = Math.floor((amountCents * rate) / 100);
        return {
          card_id: card.id as string,
          card_name: (card.card_product_name || card.account_name || "Card") as string,
          card_mask: card.account_mask as string,
          rewards_rate: rate,
          earned_cents: earnedCents,
          earned_dollars: (earnedCents / 100).toFixed(2),
        };
      }).sort((a, b) => b.earned_cents - a.earned_cents);

      return ranked;
    }

    case "calculate_missed_rewards": {
      const days = (toolInput.period_days as number) || 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const { data: txns, error } = await supabase
        .from("transactions")
        .select("id, amount, category, credit_card_id, rewards_earned_cents, rewards_possible_cents")
        .eq("user_id", userId)
        .gte("timestamp", since)
        .gt("amount", 0);
      if (error) throw new Error(`Transactions query failed: ${error.message}`);
      if (!txns?.length) return { missed_cents: 0, earned_cents: 0, possible_cents: 0, message: "No transactions in this period." };

      const totalEarned = txns.reduce((s, t) => s + (t.rewards_earned_cents || 0), 0);
      const totalPossible = txns.reduce((s, t) => s + (t.rewards_possible_cents || 0), 0);

      // Group by category for breakdown
      const byCategory: Record<string, { earned: number; possible: number; count: number }> = {};
      for (const t of txns) {
        const cat = t.category || "other";
        if (!byCategory[cat]) byCategory[cat] = { earned: 0, possible: 0, count: 0 };
        byCategory[cat].earned += t.rewards_earned_cents || 0;
        byCategory[cat].possible += t.rewards_possible_cents || 0;
        byCategory[cat].count += 1;
      }

      return {
        period_days: days,
        total_transactions: txns.length,
        earned_cents: totalEarned,
        earned_dollars: (totalEarned / 100).toFixed(2),
        possible_cents: totalPossible,
        possible_dollars: (totalPossible / 100).toFixed(2),
        missed_cents: Math.max(0, totalPossible - totalEarned),
        missed_dollars: Math.max(0, (totalPossible - totalEarned) / 100).toFixed(2),
        efficiency_pct: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 100,
        by_category: Object.entries(byCategory)
          .map(([cat, v]) => ({
            category: cat,
            earned_dollars: (v.earned / 100).toFixed(2),
            possible_dollars: (v.possible / 100).toFixed(2),
            missed_dollars: Math.max(0, (v.possible - v.earned) / 100).toFixed(2),
            transaction_count: v.count,
          }))
          .sort((a, b) => parseFloat(b.missed_dollars) - parseFloat(a.missed_dollars)),
      };
    }

    case "get_card_apply_recommendations": {
      // Get user's 90-day spending by category
      const { data: spending } = await supabase.rpc("get_category_spending_90d", { p_user_id: userId });

      // Get card names the user already has
      const { data: existingCards } = await supabase
        .from("credit_cards")
        .select("card_product_name")
        .eq("user_id", userId)
        .eq("is_active", true);
      const existingNames = (existingCards ?? []).map((c) => c.card_product_name).filter(Boolean);

      // Fetch catalog cards the user doesn't have
      let catalogQuery = supabase
        .from("card_catalog")
        .select("*")
        .eq("is_active", true);
      if (existingNames.length > 0) {
        catalogQuery = catalogQuery.not("card_product_name", "in", `(${existingNames.map((n) => `"${n}"`).join(",")})`);
      }
      const { data: catalog } = await catalogQuery.limit(50);

      // Score each catalog card against spending
      const spendingMap: Record<string, number> = {};
      for (const row of (spending ?? []) as Array<{ category: string; total_cents: number }>) {
        spendingMap[row.category?.toLowerCase()] = row.total_cents;
      }

      const scored = (catalog ?? []).map((card) => {
        const rates = (card.category_rates as Record<string, number>) ?? {};
        let projectedEarningsCents = 0;
        for (const [cat, spend] of Object.entries(spendingMap)) {
          const rate = rates[cat] ?? card.base_rewards_rate ?? 1.0;
          projectedEarningsCents += Math.floor((spend * rate) / 100);
        }
        const annualProjected = projectedEarningsCents * (365 / 90);
        const netValueCents = annualProjected - (card.annual_fee ?? 0);
        return {
          ...card,
          projected_annual_earnings_cents: Math.round(annualProjected),
          projected_annual_earnings_dollars: (annualProjected / 100).toFixed(0),
          net_value_after_fee_dollars: (netValueCents / 100).toFixed(0),
          signup_bonus_value_dollars: card.signup_bonus_points ? (card.signup_bonus_points / 100).toFixed(0) : "0",
        };
      }).sort((a, b) => b.projected_annual_earnings_cents - a.projected_annual_earnings_cents);

      return { top_recommendations: scored.slice(0, 5), spending_by_category: spending };
    }

    case "detect_anomalies": {
      const days = (toolInput.days as number) || 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const { data: txns, error } = await supabase
        .from("transactions")
        .select("id, description, amount, timestamp, category")
        .eq("user_id", userId)
        .gte("timestamp", since)
        .order("timestamp", { ascending: false });
      if (error) throw new Error(`Transactions query failed: ${error.message}`);
      if (!txns?.length) return { anomalies: [], message: "No transactions found in this period." };

      const anomalies: Array<{ type: string; description: string; amount: number; timestamp: string; id: string }> = [];
      const seen = new Map<string, { amount: number; timestamp: string; id: string }>();

      // Duplicate detection: same merchant name + amount within 7 days
      for (const tx of txns) {
        const key = `${(tx.description || "").toLowerCase().slice(0, 30)}:${tx.amount}`;
        const prev = seen.get(key);
        if (prev) {
          const diff = Math.abs(new Date(tx.timestamp).getTime() - new Date(prev.timestamp).getTime());
          if (diff < 7 * 86_400_000) {
            anomalies.push({
              type: "duplicate_charge",
              description: `Possible duplicate: "${tx.description}" — $${Number(tx.amount).toFixed(2)} charged twice within 7 days`,
              amount: Number(tx.amount),
              timestamp: tx.timestamp,
              id: tx.id,
            });
          }
        }
        seen.set(key, { amount: Number(tx.amount), timestamp: tx.timestamp, id: tx.id });
      }

      // Large transaction: >3x the user's average spend
      const avgAmount = txns.reduce((s, t) => s + Number(t.amount), 0) / txns.length;
      for (const tx of txns) {
        if (Number(tx.amount) > avgAmount * 3 && Number(tx.amount) > 20000) {
          // Only flag if > $200 and 3x average
          if (!anomalies.find((a) => a.id === tx.id)) {
            anomalies.push({
              type: "large_transaction",
              description: `Unusually large transaction: "${tx.description}" — $${Number(tx.amount).toFixed(2)} (${Math.round(Number(tx.amount) / avgAmount)}x your average)`,
              amount: Number(tx.amount),
              timestamp: tx.timestamp,
              id: tx.id,
            });
          }
        }
      }

      return { anomalies, total_transactions_scanned: txns.length, average_transaction: avgAmount.toFixed(2) };
    }

    case "get_spending_summary": {
      const days = (toolInput.days as number) || 30;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const prevSince = new Date(Date.now() - days * 2 * 86_400_000).toISOString();

      const [{ data: current }, { data: previous }] = await Promise.all([
        supabase.from("transactions").select("amount, category, description, timestamp")
          .eq("user_id", userId).gte("timestamp", since).gt("amount", 0),
        supabase.from("transactions").select("amount, category")
          .eq("user_id", userId).gte("timestamp", prevSince).lt("timestamp", since).gt("amount", 0),
      ]);

      const curr = current ?? [];
      const prev = previous ?? [];

      const totalCurrent = curr.reduce((s, t) => s + Number(t.amount), 0);
      const totalPrevious = prev.reduce((s, t) => s + Number(t.amount), 0);
      const changePercent = totalPrevious > 0
        ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100)
        : null;

      // By category
      const byCat: Record<string, number> = {};
      for (const t of curr) {
        const cat = t.category || "other";
        byCat[cat] = (byCat[cat] ?? 0) + Number(t.amount);
      }
      const topCategories = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([cat, total]) => ({
          category: cat,
          total_dollars: total.toFixed(2),
          percentage: Math.round((total / totalCurrent) * 100),
        }));

      // Top merchants
      const byMerchant: Record<string, number> = {};
      for (const t of curr) {
        const m = (t.description || "Other").slice(0, 40);
        byMerchant[m] = (byMerchant[m] ?? 0) + Number(t.amount);
      }
      const topMerchants = Object.entries(byMerchant)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([merchant, total]) => ({ merchant, total_dollars: total.toFixed(2) }));

      return {
        period_days: days,
        total_spent_dollars: totalCurrent.toFixed(2),
        previous_period_dollars: totalPrevious.toFixed(2),
        change_percent: changePercent,
        transaction_count: curr.length,
        avg_transaction_dollars: curr.length > 0 ? (totalCurrent / curr.length).toFixed(2) : "0.00",
        top_categories: topCategories,
        top_merchants: topMerchants,
      };
    }

    case "save_recommendation": {
      const { data, error } = await supabase
        .from("ai_recommendations")
        .insert({ user_id: userId, ...toolInput })
        .select()
        .single();
      if (error) {
        console.warn("save_recommendation failed (non-fatal):", error.message);
        return { saved: false };
      }
      return { saved: true, id: data?.id };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ── USER MESSAGE BUILDER ──────────────────────────────────────────────────────

function buildUserMessage(intent: string, payload: Record<string, unknown>): string {
  switch (intent) {
    case "best_card_now":
      return `I'm about to make a purchase${payload.merchant ? ` at "${payload.merchant}"` : ""} in the ${payload.category || "other"} category${payload.amount_cents ? ` for $${(Number(payload.amount_cents) / 100).toFixed(2)}` : ""}. Which of my credit cards should I use to maximize rewards?`;
    case "analyze_spending":
      return `Analyze my spending for the last ${payload.period === "week" ? "7" : payload.period === "quarter" ? "90" : "30"} days. Give me key insights, my top spending categories with totals, how I'm trending vs the previous period, and one specific action I can take to earn more rewards.`;
    case "missed_rewards":
      return `Calculate how much in rewards I've missed over the last ${payload.days || 30} days. Show me the total, the categories where I lost the most, and which card I should have used instead for each.`;
    case "apply_recommendations":
      return `Based on my actual spending over the last 90 days, recommend the top 2 credit cards I should apply for to earn significantly more rewards. For each card, show me: projected annual earnings, signup bonus value, annual fee, and net ROI calculation.`;
    case "anomaly_check":
      return `Check my transactions from the last 30 days for anything unusual: duplicate charges, unusually large transactions, or anything that looks wrong. Flag anything that needs my attention.`;
    case "chat":
      return (payload.message as string) || "How can I maximize my credit card rewards?";
    default:
      return `Help me with: ${intent}. ${payload.message || ""}`;
  }
}

function summarizeDeterministic(intent: string, data: unknown): string {
  const value = data as Record<string, unknown>;

  if (intent === "analyze_spending") {
    const total = value.total_spent_dollars ?? "0.00";
    const txCount = value.transaction_count ?? 0;
    const top = Array.isArray(value.top_categories) ? value.top_categories[0] as { category?: string; total_dollars?: string } : null;
    return top
      ? `You spent $${total} across ${txCount} transactions. Your top category is ${top.category} at $${top.total_dollars}.`
      : `You spent $${total} across ${txCount} transactions. Add more transaction history for stronger recommendations.`;
  }

  if (intent === "best_card_now" && Array.isArray(data)) {
    const best = data[0] as { card_name?: string; rewards_rate?: number; earned_dollars?: string } | undefined;
    return best
      ? `Use ${best.card_name}. It should earn about ${best.rewards_rate}% back, or $${best.earned_dollars} for this purchase.`
      : "Add a credit card first so TrueSpend can compare rewards.";
  }

  if (intent === "missed_rewards") {
    return `Estimated missed rewards for this period: $${value.missed_dollars ?? "0.00"}.`;
  }

  if (intent === "apply_recommendations") {
    const recs = (value.top_recommendations as Array<{ card_product_name?: string; net_value_after_fee_dollars?: string }> | undefined) ?? [];
    const best = recs[0];
    return best
      ? `${best.card_product_name} currently looks like the strongest card to review, with estimated net annual value around $${best.net_value_after_fee_dollars}.`
      : "No card application recommendation is available yet. Add cards and sync transactions first.";
  }

  if (intent === "anomaly_check") {
    const anomalies = (value.anomalies as unknown[] | undefined) ?? [];
    return anomalies.length
      ? `Found ${anomalies.length} item${anomalies.length === 1 ? "" : "s"} worth reviewing.`
      : "No obvious duplicate or unusually large transactions were found in the scan window.";
  }

  return "AI chat requires the Claude API key. The app is still usable, but conversational recommendations are paused.";
}

async function executeDeterministicIntent(
  intent: string,
  payload: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<AgentResult> {
  let data: unknown = null;

  switch (intent) {
    case "analyze_spending":
      data = await executeToolCall("get_spending_summary", { days: daysForPeriod(payload.period) }, supabase, userId);
      break;
    case "best_card_now":
      data = await executeToolCall("get_best_card_for_purchase", {
        merchant_category: payload.category || "other",
        amount_cents: payload.amount_cents,
      }, supabase, userId);
      break;
    case "missed_rewards":
      data = await executeToolCall("calculate_missed_rewards", { period_days: payload.days || 30 }, supabase, userId);
      break;
    case "apply_recommendations":
      data = await executeToolCall("get_card_apply_recommendations", {}, supabase, userId);
      break;
    case "anomaly_check":
      data = await executeToolCall("detect_anomalies", { days: payload.days || 30 }, supabase, userId);
      break;
    default:
      data = { message: "Claude API key is required for chat." };
  }

  return {
    response: summarizeDeterministic(intent, data),
    data,
    intent,
    degraded: true,
    model: "deterministic-fallback",
  };
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { intent, payload = {} } = await req.json() as { intent: string; payload?: Record<string, unknown> };
    if (!intent) {
      return new Response(JSON.stringify({ error: "intent is required" }), { status: 400, headers: corsHeaders });
    }

    const admin = getAdminClient();
    const rateLimit = await checkUserRateLimit(admin, user.id, intent);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: "AI request rate limit exceeded",
        retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
        },
      });
    }

    const cached = await getCachedAgentResult(supabase, user.id, intent, payload as Record<string, unknown>);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-AI-Cache": "HIT" },
      });
    }

    if (!anthropic) {
      const fallback = await executeDeterministicIntent(intent, payload as Record<string, unknown>, supabase, user.id);
      await saveCachedAgentResult(supabase, user.id, intent, payload as Record<string, unknown>, fallback);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-AI-Provider": "fallback" },
      });
    }

    const userMessage = buildUserMessage(intent, payload as Record<string, unknown>);
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

    let finalResponse = "";
    let structuredData: unknown = null;
    let iterations = 0;
    const MAX_ITERATIONS = 6;
    const model = modelForIntent(intent);

    // ── Agentic loop ────────────────────────────────────────────────────────
    try {
      while (iterations < MAX_ITERATIONS) {
        iterations++;

        const response = await anthropic.messages.create({
          model,
          max_tokens: maxTokensForIntent(intent),
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        });

        if (response.stop_reason === "end_turn") {
          finalResponse = response.content
            .filter((b) => b.type === "text")
            .map((b) => (b as Anthropic.TextBlock).text)
            .join("");
          break;
        }

        if (response.stop_reason === "tool_use") {
          const toolUseBlocks = response.content.filter((b) => b.type === "tool_use") as Anthropic.ToolUseBlock[];
          messages.push({ role: "assistant", content: response.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (toolUse) => {
              try {
                const result = await executeToolCall(
                  toolUse.name,
                  toolUse.input as Record<string, unknown>,
                  supabase,
                  user.id
                );
                // Capture structured data from key tools for direct use in UI
                if (toolUse.name === "get_spending_summary") structuredData = result;
                if (toolUse.name === "get_best_card_for_purchase") structuredData = result;
                if (toolUse.name === "calculate_missed_rewards") structuredData = result;
                if (toolUse.name === "get_card_apply_recommendations") structuredData = result;
                if (toolUse.name === "detect_anomalies") structuredData = result;
                return {
                  type: "tool_result" as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result),
                };
              } catch (e) {
                console.error(`Tool ${toolUse.name} error:`, e);
                return {
                  type: "tool_result" as const,
                  tool_use_id: toolUse.id,
                  content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
                  is_error: true,
                };
              }
            })
          );

          messages.push({ role: "user", content: toolResults });
          continue;
        }

        break; // Unexpected stop reason
      }
    } catch (error) {
      if (!isRateLimitError(error)) throw error;

      const fallback = await executeDeterministicIntent(intent, payload as Record<string, unknown>, supabase, user.id);
      await saveCachedAgentResult(supabase, user.id, intent, payload as Record<string, unknown>, fallback);
      return new Response(JSON.stringify({
        ...fallback,
        response: `${fallback.response} AI wording is temporarily using a lower-cost fallback because the model rate limit was reached.`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-AI-Provider": "fallback-rate-limit" },
      });
    }

    const result: AgentResult = { response: finalResponse, data: structuredData, intent, cached: false, model };
    await saveCachedAgentResult(supabase, user.id, intent, payload as Record<string, unknown>, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-AI-Cache": "MISS" },
    });
  } catch (error) {
    console.error("[ai-agent] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
