import { useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";

type FeatureValue = string | number | boolean | null | undefined;

type FeatureGate = {
  planCode: string;
  isPro: boolean;
  cardLinkLimit: number | null;
  unlimitedCards: boolean;
  has: (featureCode: string) => boolean;
  value: (featureCode: string) => string | number | boolean | null;
};

const NO_ENTITLEMENTS: FeatureGate = {
  planCode: "basic",
  isPro: false,
  cardLinkLimit: 3,
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

    return {
      planCode,
      isPro: planCode.toLowerCase() === "pro",
      cardLinkLimit: live?.cardLinkLimit ?? toNumber(features.card_link_limit),
      unlimitedCards: live?.unlimitedCards ?? toBoolean(features.unlimited_cards),
      has: (featureCode: string) => toBoolean(features[featureCode]),
      value: (featureCode: string) => (features[featureCode] as string | number | boolean | undefined) ?? null
    };
  }, [bootstrap?.entitlements, live]);
}
