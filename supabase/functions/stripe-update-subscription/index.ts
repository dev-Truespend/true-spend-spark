import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { priceId } = await req.json();
    if (!priceId || typeof priceId !== "string") throw new Error("priceId is required");

    const allowedPriceIds = new Set(
      [
        Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"),
        Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID"),
        ...(Deno.env.get("STRIPE_PRO_PRICE_IDS") ?? "").split(","),
      ].filter(Boolean)
    );
    if (allowedPriceIds.size > 0 && !allowedPriceIds.has(priceId)) {
      throw new Error("Unsupported Stripe price");
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    if (subError || !sub?.stripe_subscription_id) {
      throw new Error("No active Stripe subscription found");
    }

    const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) throw new Error("Subscription has no billable items");

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: { supabase_user_id: user.id },
    });

    await supabaseAdmin
      .from("subscriptions")
      .update({
        stripe_price_id: priceId,
        plan: "pro",
        status: updated.status,
        current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        cancel_at_period_end: updated.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ subscriptionId: updated.id, status: updated.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Stripe] update-subscription error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
