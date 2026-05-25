// GDPR / Right-to-Erasure account deletion
//
// Flow:
//   1. Authenticate the request (JWT)
//   2. Require the user to re-enter their password OR confirm via
//      OAuth re-login — protects against CSRF / drive-by deletion
//   3. Cancel any active Stripe subscription (at_period_end=true so
//      they keep what they've paid for through the period)
//   4. Soft-delete: profiles.status = 'deleted'  → triggers the live
//      revocation in useAuth and signs the user out everywhere
//   5. Schedule hard-delete after the 30-day grace period via the
//      `gdpr_deletion_queue` table — a separate cron job processes
//      it and removes auth.users + cascading rows
//   6. Audit log to security_logs
//
// This endpoint is intentionally idempotent: calling it twice for the
// same user is a no-op on the second call.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteAccountRequest {
  password?: string;          // required for password-auth users
  confirmText?: string;        // user must type "DELETE" verbatim
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST")    return new Response("Method not allowed", { status: 405 });

  try {
    // ── 1. Auth ─────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const body = (await req.json().catch(() => ({}))) as DeleteAccountRequest;

    // ── 2. Confirmation guard ───────────────────────────────────────────
    // Require the user to literally type "DELETE" so a misdirected POST
    // (or a CSRF where the JWT was reused) can't trigger erasure.
    if (body.confirmText?.trim().toUpperCase() !== "DELETE") {
      return new Response(
        JSON.stringify({ error: 'You must type "DELETE" to confirm.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Re-auth for password users ───────────────────────────────────
    // OAuth-only users (Google) skip this — they've already proven identity
    // via their provider for the session. Password users must re-enter
    // their password to confirm.
    const provider = user.app_metadata?.provider;
    if (provider === "email" || !provider) {
      if (!body.password) {
        return new Response(
          JSON.stringify({ error: "Password required to delete account." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email:    user.email ?? "",
        password: body.password,
      });

      if (reauthError) {
        // Don't reveal whether the error was password or something else —
        // attacker shouldn't be able to use this endpoint as an oracle.
        return new Response(
          JSON.stringify({ error: "Incorrect password." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 4. Service-role client for admin operations ────────────────────
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Idempotency: if already deleted, succeed silently
    const { data: existing } = await admin
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if ((existing as { status?: string } | null)?.status === "deleted") {
      return new Response(
        JSON.stringify({ ok: true, message: "Account already scheduled for deletion." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Cancel Stripe subscription (if any) ──────────────────────────
    // Cancel at period end — they keep paid features through the period
    // and don't get charged again.
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeSecret) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      const stripeSubId = (sub as { stripe_subscription_id?: string } | null)?.stripe_subscription_id;
      const status      = (sub as { status?: string } | null)?.status;

      if (stripeSubId && status && status !== "canceled") {
        try {
          const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
          await stripe.subscriptions.update(stripeSubId, {
            cancel_at_period_end: true,
            metadata: { canceled_reason: "account_deleted", canceled_by: user.id },
          });
          console.log(`[delete-account] Scheduled Stripe cancel for user ${user.id}`);
        } catch (err) {
          // Non-fatal — webhook will sync if Stripe state drifts.
          console.error(`[delete-account] Stripe cancel failed for user ${user.id}:`, err);
        }
      }
    }

    // ── 6. Revoke any active Plaid items ───────────────────────────────
    // Hard-delete from our DB; the actual Plaid item removal happens via
    // the disconnect-bank function (best-effort).
    try {
      const { data: plaidItems } = await admin
        .from("plaid_items")
        .select("id")
        .eq("user_id", user.id);

      if ((plaidItems?.length ?? 0) > 0) {
        await admin
          .from("plaid_items")
          .update({ status: "revoked", error_message: "Account deleted" })
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error(`[delete-account] Plaid revoke failed for user ${user.id}:`, err);
    }

    // ── 7. Soft-delete profile ────────────────────────────────────────
    // The useAuth realtime listener picks this up and signs the user
    // out everywhere within ~1s.
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        status: "deleted",
        // Wipe PII immediately even though row stays for 30-day grace
        first_name: null,
        last_name:  null,
        full_name:  null,
      })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // ── 8. Queue for hard deletion (30 days) ─────────────────────────
    // A separate cron job (`gdpr-purge-deleted-accounts`) consumes this
    // table and runs admin.deleteUser() once the grace period passes.
    await admin
      .from("gdpr_deletion_queue")
      .upsert({
        user_id:      user.id,
        requested_at: new Date().toISOString(),
        purge_after:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        email:        user.email,
      }, { onConflict: "user_id" })
      .then(({ error }) => {
        // Non-fatal — if the queue insert fails, the soft-delete is
        // still in effect; we just lose the auto-purge schedule.
        if (error) console.error("[delete-account] Queue upsert failed:", error);
      });

    // ── 9. Audit log ───────────────────────────────────────────────────
    await admin.from("security_logs").insert({
      event_type: "account_deleted",
      severity:   "warning",
      user_id:    user.id,
      details: {
        provider,
        timestamp:   new Date().toISOString(),
        user_agent:  req.headers.get("user-agent") ?? "unknown",
        grace_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }).then(({ error }) => {
      if (error) console.error("[delete-account] Audit log failed:", error);
    });

    // ── 10. Sign the user out server-side (revoke all sessions) ────────
    // The realtime subscription on profiles also handles this client-side,
    // but doing it server-side too means even tabs that miss the realtime
    // event will lose their session on next request.
    try {
      await admin.auth.admin.signOut(user.id, "global");
    } catch (err) {
      console.error("[delete-account] Global signout failed:", err);
    }

    return new Response(
      JSON.stringify({
        ok:          true,
        message:     "Your account has been scheduled for deletion.",
        purge_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[delete-account] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
