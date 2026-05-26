import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.80.0";

export const jsonHeaders = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const extensionOriginPatterns = [
  /^chrome-extension:\/\/[a-z]{32}$/,
  /^moz-extension:\/\/[a-f0-9-]{36}$/,
  /^safari-web-extension:\/\/[A-F0-9-]{36}$/,
];

const devOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const configured = (Deno.env.get("ALLOWED_WEB_ORIGINS") ?? Deno.env.get("APP_URL") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const configuredOrigins = new Set(configured);
  const isDev = Deno.env.get("ENVIRONMENT") !== "production";

  const allowedOrigin =
    !origin ? "*" :
    configuredOrigins.has(origin) ? origin :
    extensionOriginPatterns.some((pattern) => pattern.test(origin)) ? origin :
    isDev && devOrigins.has(origin) ? origin :
    "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-extension-id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function jsonResponse(req: Request, payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(req), ...jsonHeaders },
  });
}

export function errorResponse(req: Request, message: string, status = 400, details?: unknown): Response {
  return jsonResponse(req, { error: message, details }, status);
}

export function getUserClient(req: Request): SupabaseClient {
  const authorization = req.headers.get("authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export async function requireUser(req: Request): Promise<{ client: SupabaseClient; user: User }> {
  const authorization = req.headers.get("authorization");
  if (!authorization) throw new HttpError("Missing authorization header", 401);

  const client = getUserClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError("Unauthorized", 401);

  return { client, user: data.user };
}

export async function requireAdmin(req: Request): Promise<{ user: User; service: SupabaseClient }> {
  const { client, user } = await requireUser(req);
  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new HttpError("Unable to verify admin access", 403);
  if ((data as { role?: string } | null)?.role !== "admin") {
    throw new HttpError("Admin access required", 403);
  }

  return { user, service: getServiceClient() };
}

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function parseJson<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

export function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  const withProtocol = raw.includes("://") ? raw : `https://${raw}`;
  try {
    const host = new URL(withProtocol).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? raw;
  }
}

type RewardUnit = "percent" | "points_per_dollar" | "miles_per_dollar";

export function calculateRewardValueCents(
  amountCents: number,
  rewardRate: number,
  rewardUnit: RewardUnit,
  pointValueCents = 1,
): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  if (!Number.isFinite(rewardRate) || rewardRate <= 0) return 0;

  if (rewardUnit === "percent") {
    return Math.round((amountCents * rewardRate) / 100);
  }

  const dollars = amountCents / 100;
  return Math.round(dollars * rewardRate * pointValueCents);
}

export function formatRewardRate(rate: number, unit: RewardUnit): string {
  const value = Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
  return unit === "percent" ? `${value}%` : `${value}x`;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export async function resolveMerchant(service: SupabaseClient, domainInput: string) {
  const domain = normalizeDomain(domainInput);
  const { data, error } = await service
    .from("merchant_domains")
    .select("domain, merchant_name, normalized_category, subcategory, confidence_score, is_verified")
    .eq("domain", domain)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      status: "unknown" as const,
      merchant: {
        domain,
        merchant_name: domain,
        normalized_category: "other",
        confidence_score: 0,
        is_verified: false,
      },
    };
  }

  return { status: "known" as const, merchant: data };
}

export async function rankUserCards(
  userClient: SupabaseClient,
  userId: string,
  category: string,
  amountCents: number,
) {
  const { data: cards, error: cardsError } = await userClient
    .from("user_credit_cards")
    .select(`
      id,
      display_name,
      issuer,
      network,
      card_catalog_id,
      rewards_confirmed_by_user,
      card_catalog:card_catalog_id (
        id,
        card_name,
        issuer,
        base_reward_rate,
        base_reward_unit,
        verification_status
      )
    `)
    .eq("user_id", userId)
    .eq("is_active", true);

  if (cardsError) throw cardsError;
  if (!cards?.length) return [];

  const userCardIds = cards.map((card: any) => card.id);
  const catalogIds = cards.map((card: any) => card.card_catalog_id).filter(Boolean);

  const { data: overrides, error: overridesError } = await userClient
    .from("user_card_reward_overrides")
    .select("user_credit_card_id, category, reward_rate, reward_unit")
    .eq("user_id", userId)
    .in("user_credit_card_id", userCardIds)
    .eq("category", category);

  if (overridesError) throw overridesError;

  const { data: rules, error: rulesError } = catalogIds.length
    ? await userClient
      .from("card_reward_rules")
      .select("card_catalog_id, category, reward_rate, reward_unit, status")
      .in("card_catalog_id", catalogIds)
      .eq("category", category)
      .in("status", ["verified", "needs_review"])
    : { data: [], error: null };

  if (rulesError) throw rulesError;

  return cards
    .map((card: any) => {
      const catalog = Array.isArray(card.card_catalog) ? card.card_catalog[0] : card.card_catalog;
      const override = overrides?.find((row: any) => row.user_credit_card_id === card.id);
      const rule = rules?.find((row: any) => row.card_catalog_id === card.card_catalog_id);

      const selected = override ?? rule ?? {
        reward_rate: Number(catalog?.base_reward_rate ?? 1),
        reward_unit: catalog?.base_reward_unit ?? "percent",
      };
      const rewardRate = Number(selected.reward_rate ?? 1);
      const rewardUnit = selected.reward_unit as RewardUnit;
      const estimatedValueCents = calculateRewardValueCents(amountCents, rewardRate, rewardUnit);
      const cardName = card.display_name || catalog?.card_name || "Credit card";

      return {
        user_credit_card_id: card.id,
        card_name: cardName,
        issuer: card.issuer ?? catalog?.issuer ?? null,
        reward_rate: rewardRate,
        reward_unit: rewardUnit,
        reward_label: formatRewardRate(rewardRate, rewardUnit),
        estimated_value_cents: estimatedValueCents,
        estimated_value_label: formatMoney(estimatedValueCents),
        source: override ? "user_override" : rule ? "catalog_rule" : "base_rate",
      };
    })
    .sort((a: any, b: any) => b.estimated_value_cents - a.estimated_value_cents);
}

export function safeError(error: unknown): { message: string; status: number; details?: unknown } {
  if (error instanceof HttpError) {
    return { message: error.message, status: error.status, details: error.details };
  }
  if (error instanceof Error) {
    return { message: "Request failed", status: 500, details: Deno.env.get("ENVIRONMENT") === "development" ? error.message : undefined };
  }
  return { message: "Request failed", status: 500 };
}
