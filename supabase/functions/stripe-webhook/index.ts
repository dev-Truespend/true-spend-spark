import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe subscription status → our plan field
function getPlanFromPriceId(priceId: string | null): string {
  if (!priceId) return "free";
  const proPriceIds = (Deno.env.get("STRIPE_PRO_PRICE_IDS") ?? "").split(",").filter(Boolean);
  const enterprisePriceIds = (Deno.env.get("STRIPE_ENTERPRISE_PRICE_IDS") ?? "").split(",").filter(Boolean);
  if (enterprisePriceIds.includes(priceId)) return "enterprise";
  if (proPriceIds.includes(priceId)) return "pro";
  return "pro"; // default any paid subscription to pro
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret    = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey || !webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log(`[Stripe Webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      // ── Subscription created (user subscribes for the first time) ──────────
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) { console.warn("[Stripe] No supabase_user_id in subscription metadata"); break; }

        const priceId = (sub.items.data[0]?.price?.id) ?? null;

        await supabase.from("subscriptions").upsert({
          user_id:                userId,
          stripe_customer_id:     sub.customer as string,
          stripe_subscription_id: sub.id,
          stripe_price_id:        priceId,
          plan:                   getPlanFromPriceId(priceId),
          status:                 sub.status,
          current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:   sub.cancel_at_period_end,
          trial_end:              sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        }, { onConflict: "user_id" });

        console.log(`[Stripe] Subscription created for user ${userId}, plan ${getPlanFromPriceId(priceId)}`);
        break;
      }

      // ── Subscription updated (upgrade / downgrade / cancel / trial ends) ──
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = (sub.items.data[0]?.price?.id) ?? null;

        await supabase.from("subscriptions")
          .update({
            stripe_price_id:      priceId,
            plan:                 sub.status === "canceled" ? "free" : getPlanFromPriceId(priceId),
            status:               sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            trial_end:            sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", sub.id);

        console.log(`[Stripe] Subscription updated: ${sub.id}, status: ${sub.status}`);
        break;
      }

      // ── Subscription deleted (hard cancel) ────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await supabase.from("subscriptions")
          .update({ status: "canceled", plan: "free" })
          .eq("stripe_subscription_id", sub.id);

        console.log(`[Stripe] Subscription canceled: ${sub.id}`);
        break;
      }

      // ── Invoice paid (confirms active subscription) ───────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase.from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }

      // ── Invoice payment failed (grace period / dunning) ───────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase.from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);

          // Trigger payment failed email notification
          const { data: sub } = await supabase.from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .single();

          if (sub?.user_id) {
            await supabase.functions.invoke("send-email-notification", {
              body: {
                userId: sub.user_id,
                type: "payment_failed",
                subject: "Payment failed — action required",
              },
            });
          }
        }
        break;
      }

      // ── Customer created (portal / checkout) ──────────────────────────────
      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        const userId = customer.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from("subscriptions").upsert({
            user_id:            userId,
            stripe_customer_id: customer.id,
            plan:               "free",
            status:             "incomplete",
          }, { onConflict: "user_id" });
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
