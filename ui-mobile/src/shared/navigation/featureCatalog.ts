// Central feature-gating catalog: maps a server feature code to its minimum plan, a short lock
// label, upsell copy, and the paywall plan to pre-select. The source of truth for whether a user
// is entitled is still the server (entitlements). This catalog only drives the locked UI + upsell.

export type PlanCode = "free" | "basic" | "pro";

export type FeatureCatalogEntry = {
  minPlan: PlanCode;
  lockLabel: string;
  upsellTitle: string;
  upsellBody: string;
  // Plan to pre-select on the paywall when the user taps the locked feature.
  paywallPlanCode: PlanCode;
};

const PLAN_RANK: Record<PlanCode, number> = { free: 0, basic: 1, pro: 2 };

export function planRank(planCode: string | null | undefined): number {
  const normalized = (planCode ?? "free").toLowerCase() as PlanCode;
  return PLAN_RANK[normalized] ?? 0;
}

export function planMeets(planCode: string | null | undefined, minPlan: PlanCode): boolean {
  return planRank(planCode) >= PLAN_RANK[minPlan];
}

const DEFAULT_ENTRY: FeatureCatalogEntry = {
  minPlan: "pro",
  lockLabel: "Pro",
  upsellTitle: "Upgrade to unlock",
  upsellBody: "This feature is available on a higher plan.",
  paywallPlanCode: "pro"
};

export const FEATURE_CATALOG: Record<string, FeatureCatalogEntry> = {
  ai_insights_enabled: {
    minPlan: "pro",
    lockLabel: "Pro",
    upsellTitle: "AI insights are a Pro feature",
    upsellBody: "Get personalized reward-optimization tips based on your spending patterns.",
    paywallPlanCode: "pro"
  },
  // Geofencing (the location-arrival master switch) is on for every tier — Free included.
  // Plans differ only by the per-day recommendation cap (geo_recommendations_per_day:
  // Free 1, Basic 3, Pro unlimited), which the server enforces; it is not a boolean lock.
  // minPlan "free" means FeatureGate never locks this; the upsell copy promotes a higher cap.
  geofencing_enabled: {
    minPlan: "free",
    lockLabel: "Pro",
    upsellTitle: "Get more location recommendations",
    upsellBody: "Free includes 1 store recommendation per day. Upgrade to Basic for 3, or Pro for unlimited.",
    paywallPlanCode: "pro"
  },
  manual_resync_enabled: {
    minPlan: "pro",
    lockLabel: "Pro",
    upsellTitle: "Manual sync is a Pro feature",
    upsellBody: "Refresh your accounts on demand. Pro members get daily manual syncs.",
    paywallPlanCode: "pro"
  },
  unlimited_cards: {
    minPlan: "pro",
    lockLabel: "Pro",
    upsellTitle: "Add more cards with Pro",
    upsellBody: "Track unlimited cards and never miss a reward.",
    paywallPlanCode: "pro"
  },
  plaid_linking_enabled: {
    minPlan: "basic",
    lockLabel: "Basic",
    upsellTitle: "Bank linking needs Basic",
    upsellBody: "Connect your bank to import cards and transactions automatically.",
    paywallPlanCode: "basic"
  },
  plaid_transactions_view_enabled: {
    minPlan: "basic",
    lockLabel: "Basic",
    upsellTitle: "Imported transactions need Basic",
    upsellBody: "See bank-imported transactions alongside your manual ones.",
    paywallPlanCode: "basic"
  }
};

export function featureCatalogEntry(featureCode: string): FeatureCatalogEntry {
  return FEATURE_CATALOG[featureCode] ?? DEFAULT_ENTRY;
}
