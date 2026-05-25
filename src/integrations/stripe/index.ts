import { loadStripe, type Stripe } from "@stripe/stripe-js";

// ── Stripe.js singleton (lazy-loaded) ────────────────────────────────────
let _stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripe(): ReturnType<typeof loadStripe> {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key) {
    console.warn("[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set — Stripe unavailable");
    return Promise.resolve(null);
  }
  if (!_stripePromise) {
    _stripePromise = loadStripe(key);
  }
  return _stripePromise;
}

// ── Types ────────────────────────────────────────────────────────────────

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export type Plan = "free" | "pro" | "enterprise";

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: Plan;
  status: StripeSubscriptionStatus | "trialing" | "incomplete";
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

/** True when the user is on a paid, active plan (active or trialing). */
export function hasActiveSubscription(sub: SubscriptionRecord | null | undefined): boolean {
  if (!sub) return false;
  return (sub.plan === "pro" || sub.plan === "enterprise") &&
    (sub.status === "active" || sub.status === "trialing");
}
