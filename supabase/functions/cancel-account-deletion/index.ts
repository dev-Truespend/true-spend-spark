// Cancel a pending account deletion during the 30-day grace period.
//
// The user must be signed in (they have ~1s before useAuth's realtime
// listener forces them out after the soft-delete, but the queue grants
// them the entire grace window via password-based re-entry too).
//
// In practice the recovery path is:
//   1. User realises they made a mistake within 30 days
//   2. They sign in (succeeds even with status='deleted' if we relax
//      the check) — OR they contact support who calls this from an
//      admin tool
//   3. This function un-soft-deletes the profile and removes the
//      queue row so the cron skips them
//
// For the in-app flow we accept any signed-in user. For the admin
// flow we accept a service-role JWT — handled by the `userId` param.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelRequest {
  userId?: string; // admin-only — service role required
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST")    return new Response("Method not allowed", { status: 405 });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const body = (await req.json().catch(() => ({}))) as CancelRequest;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Determine target — self by default, or another user if admin
    let targetUserId = user.id;
    if (body.userId && body.userId !== user.id) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r) => (r as { role: string }).role === "admin");
      if (!isAdmin) throw new Error("Forbidden");
      targetUserId = body.userId;
    }

    // Must have a pending queue row
    const { data: queueRow } = await admin
      .from("gdpr_deletion_queue")
      .select("purge_after, purged_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const row = queueRow as { purge_after: string; purged_at: string | null } | null;
    if (!row) {
      return new Response(
        JSON.stringify({ error: "No pending deletion found for this account." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (row.purged_at) {
      return new Response(
        JSON.stringify({ error: "Account has already been purged and cannot be recovered." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(row.purge_after) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Grace period has expired. Account will be purged on the next cron run." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Restore profile.status to 'active' ────────────────────────
    const { error: profileError } = await admin
      .from("profiles")
      .update({ status: "active" })
      .eq("id", targetUserId);

    if (profileError) throw profileError;

    // ── 2. Remove from deletion queue ─────────────────────────────────
    const { error: queueError } = await admin
      .from("gdpr_deletion_queue")
      .delete()
      .eq("user_id", targetUserId);

    if (queueError) {
      // Non-fatal — even if the row stays, the cron will skip it next
      // run because profile.status is no longer 'deleted'. But the row
      // would prevent future deletion requests from succeeding cleanly,
      // so log loudly.
      console.error("[cancel-deletion] Queue delete failed:", queueError);
    }

    // ── 3. Audit log ──────────────────────────────────────────────────
    await admin.from("security_logs").insert({
      event_type: "account_deletion_canceled",
      severity:   "info",
      user_id:    targetUserId,
      details: {
        canceled_by: user.id,
        timestamp:   new Date().toISOString(),
        user_agent:  req.headers.get("user-agent") ?? "unknown",
      },
    }).then(({ error }) => {
      if (error) console.error("[cancel-deletion] Audit log failed:", error);
    });

    return new Response(
      JSON.stringify({ ok: true, message: "Account deletion canceled. Your account is active." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[cancel-deletion] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
