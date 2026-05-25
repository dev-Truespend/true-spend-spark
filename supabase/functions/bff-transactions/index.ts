import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL = 60; // seconds — shorter than dashboard since transactions change more

async function redisGet(key: string): Promise<unknown> {
  const url   = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  try {
    const res  = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function redisSet(key: string, value: unknown, ttl: number): Promise<void> {
  const url   = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return;
  try {
    await fetch(`${url}/setex/${key}/${ttl}`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(value),
    });
  } catch { /* non-fatal */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Parse query params
    const url      = new URL(req.url);
    const page     = parseInt(url.searchParams.get("page")     ?? "1");
    const limit    = Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100);
    const category = url.searchParams.get("category");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo   = url.searchParams.get("dateTo");
    const cardId   = url.searchParams.get("creditCardId");
    const search   = url.searchParams.get("search");
    const synced   = url.searchParams.get("synced"); // 'true' | 'false' | null

    // Cache key includes all filter params
    const cacheKey = `bff:transactions:${user.id}:${page}:${limit}:${category ?? ""}:${dateFrom ?? ""}:${dateTo ?? ""}:${cardId ?? ""}:${search ?? ""}:${synced ?? ""}`;
    const cached   = await redisGet(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ ...cached as object, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const offset = (page - 1) * limit;

    // Build query with RLS (supabase client uses the user's JWT → RLS enforced automatically)
    let query = supabase
      .from("transactions")
      .select(`
        id, amount, category, description, timestamp,
        created_at, updated_at, receipt_url, synced,
        location_lat, location_lng,
        credit_card_id, geofence_id, merchant_id
      `, { count: "exact" })
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category)  query = query.eq("category", category);
    if (dateFrom)  query = query.gte("timestamp", dateFrom);
    if (dateTo)    query = query.lte("timestamp", dateTo);
    if (cardId)    query = query.eq("credit_card_id", cardId);
    if (synced !== null && synced !== undefined) query = query.eq("synced", synced === "true");
    if (search)    query = query.ilike("description", `%${search}%`);

    const { data: transactions, error, count } = await query;
    if (error) throw error;

    // Summary stats for this filtered view
    const { data: stats } = await supabase
      .from("transactions")
      .select("amount")
      .then((res) => res); // lightweight — just the filtered set for total

    const totalPages = Math.ceil((count ?? 0) / limit);

    const payload = {
      transactions:  transactions ?? [],
      pagination: {
        page,
        limit,
        total:      count ?? 0,
        totalPages,
        hasNext:    page < totalPages,
        hasPrev:    page > 1,
      },
      cached: false,
    };

    // Cache for 60s — skip caching page 1 with no filters more aggressively (30s)
    const ttl = page === 1 && !category && !dateFrom && !cardId ? 30 : CACHE_TTL;
    await redisSet(cacheKey, payload, ttl);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[bff-transactions] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
