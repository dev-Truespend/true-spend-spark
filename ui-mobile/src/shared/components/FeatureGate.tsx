import { ReactNode } from "react";
import { useRouter } from "expo-router";
import { ProUpsell } from "@/shared/components/ProUpsell";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { featureCatalogEntry, planMeets } from "@/shared/navigation/featureCatalog";

type FeatureGateProps = {
  // Server feature code (e.g. "ai_insights_enabled"). Looked up in the feature catalog.
  feature: string;
  children: ReactNode;
  // Optional override of the locked UI. When omitted, a catalog-driven upsell is shown.
  fallback?: ReactNode;
  // Render the upsell in its compact form.
  compact?: boolean;
};

// Renders children when the user is entitled to `feature`; otherwise renders a tappable upsell that
// routes to the paywall pre-selected to the required plan. Entitlement combines the server feature
// flag (covers trial grants) with a plan-rank check (covers plan-only features like manual_resync).
export function FeatureGate({ feature, children, fallback, compact }: FeatureGateProps) {
  const gate = useEntitlementGate();
  const router = useRouter();
  const entry = featureCatalogEntry(feature);

  const entitled = gate.has(feature) || planMeets(gate.planCode, entry.minPlan);
  if (entitled) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <ProUpsell
      title={entry.upsellTitle}
      body={entry.upsellBody}
      ctaLabel={`Upgrade to ${entry.lockLabel}`}
      compact={compact}
      onPress={() => router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: entry.paywallPlanCode } })}
    />
  );
}
