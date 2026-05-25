/**
 * Stripe Integration — COMING IN 2-4 WEEKS
 *
 * Planned features:
 *  - Subscription billing (free / pro / enterprise tiers)
 *  - Payment method management
 *  - Invoice history
 *  - Webhook handler for subscription lifecycle events
 *
 * Setup steps when ready:
 *  1. Install: npm install @stripe/stripe-js @stripe/react-stripe-js
 *  2. Add VITE_STRIPE_PUBLISHABLE_KEY to .env.example
 *  3. Add STRIPE_SECRET_KEY to Supabase Edge Function secrets
 *  4. Create Edge Functions: create-checkout-session, create-portal-session, webhook
 *  5. Wire up SubscriptionGuard component in ProtectedRoute
 */

// TODO: replace with real Stripe client once keys are configured
export const stripe = null;

export type StripeSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface StripeSubscription {
  id: string;
  status: StripeSubscriptionStatus;
  currentPeriodEnd: Date;
  planId: string;
}

/** Returns whether the user has an active paid subscription. Always false until Stripe is wired up. */
export function hasActiveSubscription(_subscription: StripeSubscription | null): boolean {
  return false; // TODO: implement after Stripe integration
}
