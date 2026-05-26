/**
 * catalog-refresh-cron
 *
 * Scheduled job that re-extracts verified cards whose last_checked_at is more
 * than CATALOG_REFRESH_INTERVAL_DAYS old (default 15). Processes up to
 * CATALOG_REFRESH_BATCH_SIZE cards per run (default 10) so a single invocation
 * stays inside the Edge Function 60s wall-clock budget.
 *
 * Idempotent: re-running before the interval elapses returns `{ processed: 0 }`.
 * Protected by a shared secret in the `x-cron-secret` header against env var
 * CRON_SECRET. Should be wired to pg_cron — see migration
 * 20260527000200_schedule_catalog_refresh.sql.
 *
 * @requires catalog-extract-card-rewards
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  getServiceClient,
  handleCors,
  jsonResponse,
  safeError,
} from "../_shared/source-truth.ts";

const INTERVAL_DAYS = Number(Deno.env.get("CATALOG_REFRESH_INTERVAL_DAYS") ?? 15);
const BATCH_SIZE = Number(Deno.env.get("CATALOG_REFRESH_BATCH_SIZE") ?? 10);

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret) return errorResponse(req, "CRON_SECRET not configured", 503);
    const providedSecret = req.headers.get("x-cron-secret");
    if (providedSecret !== cronSecret) return errorResponse(req, "Unauthorized", 401);

    const service = getServiceClient();
    const cutoff = new Date(Date.now() - INTERVAL_DAYS * 86_400_000).toISOString();

    // Pull verified cards that are stale (or never checked), oldest first.
    const { data: cards, error: cardsError } = await service
      .from("card_catalog")
      .select("id, card_name, official_product_url, official_terms_url, last_checked_at")
      .eq("verification_status", "verified")
      .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    if (cardsError) throw cardsError;
    if (!cards?.length) {
      return jsonResponse(req, { processed: 0, interval_days: INTERVAL_DAYS });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminToken = Deno.env.get("CATALOG_REFRESH_ADMIN_TOKEN");
    if (!supabaseUrl || !serviceKey || !adminToken) {
      return errorResponse(
        req,
        "catalog-refresh-cron requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CATALOG_REFRESH_ADMIN_TOKEN",
        503,
      );
    }

    const results: Array<Record<string, unknown>> = [];
    for (const card of cards) {
      const url = card.official_product_url ?? card.official_terms_url ?? null;
      if (!url) {
        results.push({ card_id: card.id, status: "skipped", reason: "no_official_url" });
        continue;
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/catalog-extract-card-rewards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Admin token must belong to a profiles.role = 'admin' user — the
            // extraction function enforces this with requireAdmin().
            Authorization: `Bearer ${adminToken}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ card_catalog_id: card.id, mode: "refresh" }),
        });

        const payload = await response.json().catch(() => ({}));
        results.push({
          card_id: card.id,
          card_name: card.card_name,
          status: response.ok ? "ok" : "error",
          http_status: response.status,
          change_count: payload?.change_count ?? null,
          extraction_confidence: payload?.extraction_confidence ?? null,
          error: response.ok ? null : payload?.error ?? `HTTP ${response.status}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "extraction call failed";
        results.push({ card_id: card.id, status: "error", error: message });
      }
    }

    return jsonResponse(req, {
      processed: results.length,
      interval_days: INTERVAL_DAYS,
      batch_size: BATCH_SIZE,
      results,
    });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.message, safe.status, safe.details);
  }
});
