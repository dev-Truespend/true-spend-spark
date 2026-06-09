import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { Plan, PlanFeature, PlanPrice } from "@/features/billing/types/billing.types";

type Props = {
  plan: Plan;
  price: PlanPrice | undefined;
  features: PlanFeature[];
  isCurrentPlan: boolean;
};

const FEATURE_ORDER = [
  "manual_card_limit",
  "plaid_card_limit",
  "geo_recommendations_per_day",
  "ai_insights_enabled",
  "unlimited_cards"
];

function valueLabel(feature: PlanFeature, planCode: string): string {
  const entry = feature.valuesByPlan.find((v) => v.planCode === planCode);
  if (!entry) return "—";
  if (feature.valueType === "boolean") {
    return entry.value.toLowerCase() === "true" ? "Included" : "Not included";
  }
  if (entry.value === "unlimited") return "Unlimited";
  return entry.value;
}

export function PlanComparisonCard({ plan, price, features, isCurrentPlan }: Props) {
  const orderedFeatures = [...features].sort((a, b) => {
    const ai = FEATURE_ORDER.indexOf(a.code);
    const bi = FEATURE_ORDER.indexOf(b.code);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.name}>{plan.displayName}</Text>
          {plan.description ? <Text style={styles.description}>{plan.description}</Text> : null}
        </View>
        <View style={styles.priceColumn}>
          <Text style={styles.price}>{price?.amount.display ?? "—"}</Text>
          {plan.trialDays > 0 ? <Text style={styles.trial}>{plan.trialDays}-day free trial</Text> : null}
        </View>
      </View>

      {isCurrentPlan ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Current plan</Text>
        </View>
      ) : null}

      <View style={styles.featureList}>
        {orderedFeatures.map((feature) => (
          <View key={feature.code} style={styles.featureRow}>
            <Text style={styles.featureName}>{feature.displayName}</Text>
            <Text style={styles.featureValue}>{valueLabel(feature, plan.code)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  titleColumn: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 18, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 13 },
  priceColumn: { alignItems: "flex-end", gap: 4 },
  price: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  trial: { color: colors.muted, fontSize: 12 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  badgeText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  featureList: { gap: 4, marginTop: spacing.xs },
  featureRow: { flexDirection: "row", justifyContent: "space-between" },
  featureName: { color: colors.text, fontSize: 13 },
  featureValue: { color: colors.muted, fontSize: 13 }
});
