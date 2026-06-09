import { useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";

type FeatureValue = string | number | boolean | null | undefined;

type FeatureGate = {
  planCode: string;
  isPro: boolean;
  manualCardLimit: number | null;
  plaidCardLimit: number | null;
  geoRecommendationsPerDay: number | null;
  unlimitedCards: boolean;
  has: (featureCode: string) => boolean;
  value: (featureCode: string) => string | number | boolean | null;
};

// Default to the Free tier when no entitlements have loaded yet (matches the server's
// no-subscription baseline): 1 manual card, no Plaid linking, 1 geo recommendation per day.
const NO_ENTITLEMENTS: FeatureGate = {
  planCode: "free",
  isPro: false,
  manualCardLimit: 1,
  plaidCardLimit: 0,
  geoRecommendationsPerDay: 1,
  unlimitedCards: false,
  has: () => false,
  value: () => null
};

function toNumber(value: FeatureValue): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: FeatureValue): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
  return false;
}

// Workflow 13 cache strategy: prefer the entitlements query (refreshed on app foreground,
// Stripe webhook return, and ENTITLEMENT_REQUIRED). Fall back to bootstrap.entitlements
// during the cold-start window before the query has loaded.
export function useEntitlementGate(): FeatureGate {
  const { bootstrap } = useAuth();
  const { entitlements: live } = useEntitlements();

  return useMemo(() => {
    const planCode = live?.planCode ?? bootstrap?.entitlements?.planCode;
    const features: Record<string, FeatureValue> =
      (live?.features as Record<string, FeatureValue> | undefined) ?? bootstrap?.entitlements?.features ?? {};

    if (!planCode) return NO_ENTITLEMENTS;

    const unlimitedCards = live?.unlimitedCards ?? toBoolean(features.unlimited_cards);
    return {
      planCode,
      isPro: planCode.toLowerCase() === "pro",
      manualCardLimit: unlimitedCards ? null : (live?.manualCardLimit ?? toNumber(features.manual_card_limit)),
      plaidCardLimit: unlimitedCards ? null : (live?.plaidCardLimit ?? toNumber(features.plaid_card_limit)),
      geoRecommendationsPerDay: live?.geoRecommendationsPerDay ?? toNumber(features.geo_recommendations_per_day),
      unlimitedCards,
      has: (featureCode: string) => toBoolean(features[featureCode]),
      value: (featureCode: string) => (features[featureCode] as string | number | boolean | undefined) ?? null
    };
  }, [bootstrap?.entitlements, live]);
}
