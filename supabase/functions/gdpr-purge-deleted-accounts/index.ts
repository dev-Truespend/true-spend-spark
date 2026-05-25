// GDPR hard-delete cron — Phase 6 / compliance
//
// This function is invoked by Supabase Cron (or any external scheduler)
// on a schedule (recommended: hourly). It reads the gdpr_deletion_queue
// for rows whose 30-day grace period has elapsed, and HARD-deletes the
// underlying auth user — which cascades through every FK in the schema
// thanks to ON DELETE CASCADE on the user_id columns.
//
// Authentication:
//   Requires a shared secret header `x-cron-secret` matching the
//   GDPR_CRON_SECRET env var. This is NOT a Supabase JWT — the cron
//   scheduler doesn't have one, and using the service-role key in a
//   scheduled HTTP call would be a credential-rotation nightmare.
//
// Idempotency:
//   - Marks `purged_at` and `attempts` on success
//   - Records `purge_error` on failure so the next run can retry
//   - Per-row try/catch so one bad user doesn't block the rest

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
};

interface QueueRow {
  user_id:      string;
  email:        string | null;
  requested_at: string;
  purge_after:  string;
  attempts:     number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Cron secret auth ───────────────────────────────────────────────
  const expected = Deno.env.get("GDPR_CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // ── Read pending purges ─────────────────────────────────────────────
  const { data: rows, error } = await supabase
    .from("gdpr_deletion_queue")
    .select("user_id, email, requested_at, purge_after, attempts")
    .is("purged_at", null)
    .lte("purge_after", new Date().toISOString())
    .limit(50); // cap per run so a backlog doesn't time out

  if (error) {
    console.error("[gdpr-purge] Queue read failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ user_id: string; ok: boolean; error?: string }> = [];

  for (const row of (rows ?? []) as QueueRow[]) {
    try {
      // Increment attempts up-front so concurrent invocations don't
      // double-process the same row.
      await supabase
        .from("gdpr_deletion_queue")
        .update({ attempts: row.attempts + 1 })
        .eq("user_id", row.user_id);

      // Hard-delete the auth user. ON DELETE CASCADE removes profile,
      // subscriptions, transactions, credit_cards, plaid_items, etc.
      const { error: delErr } = await supabase.auth.admin.deleteUser(row.user_id);

      if (delErr) {
        // User may already be gone (e.g. manually purged). Treat
        // "user not found" as success so we mark the row purged.
        const msg = delErr.message ?? "Unknown auth.admin.deleteUser error";
        const userMissing = /not.found/i.test(msg) || /no user/i.test(msg);

        if (!userMissing) {
          await supabase
            .from("gdpr_deletion_queue")
            .update({ purge_error: msg })
            .eq("user_id", row.user_id);

          results.push({ user_id: row.user_id, ok: false, error: msg });
          console.error(`[gdpr-purge] deleteUser failed for ${row.user_id}: ${msg}`);
          continue;
        }
      }

      // Mark purged
      await supabase
        .from("gdpr_deletion_queue")
        .update({
          purged_at:    new Date().toISOString(),
          purge_error:  null,
        })
        .eq("user_id", row.user_id);

      // Audit log (use email from queue since the auth row is gone)
      await supabase.from("security_logs").insert({
        event_type: "account_purged",
        severity:   "info",
        details: {
          user_id:      row.user_id,
          email:        row.email,
          requested_at: row.requested_at,
          purged_at:    new Date().toISOString(),
        },
      }).then(({ error }) => {
        if (error) console.error("[gdpr-purge] audit log failed:", error);
      });

      results.push({ user_id: row.user_id, ok: true });
      console.log(`[gdpr-purge] Hard-deleted user ${row.user_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("gdpr_deletion_queue")
        .update({ purge_error: msg })
        .eq("user_id", row.user_id);
      results.push({ user_id: row.user_id, ok: false, error: msg });
      console.error(`[gdpr-purge] Unexpected error for ${row.user_id}:`, err);
    }
  }

  return new Response(
    JSON.stringify({
      ok:        true,
      processed: results.length,
      succeeded: results.filter(r => r.ok).length,
      failed:    results.filter(r => !r.ok).length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
