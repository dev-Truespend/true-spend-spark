import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { Subscription } from "@/features/billing/types/billing.types";

type Props = {
  subscription: Subscription | null;
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

export function CurrentPlanCard({ subscription }: Props) {
  const planLabel = subscription?.planCode ? subscription.planCode.toUpperCase() : "BASIC";
  const status = subscription?.status ?? "none";
  const periodEnd = formatDate(subscription?.currentPeriodEnd ?? null);
  const trialEnd = formatDate(subscription?.trialEnd ?? null);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Current plan</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{planLabel}</Text>
        </View>
      </View>
      <Text style={styles.status}>Status: {status}</Text>
      {trialEnd ? <Text style={styles.muted}>Trial ends {trialEnd}</Text> : null}
      {periodEnd ? <Text style={styles.muted}>Renews {periodEnd}</Text> : null}
      {subscription?.cancelAtPeriodEnd ? (
        <Text style={styles.warning}>Subscription scheduled to cancel at period end.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md
  },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  label: { color: colors.muted, fontSize: 13 },
  badge: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  status: { color: colors.text, fontSize: 14, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 13 },
  warning: { color: colors.danger, fontSize: 13 }
});
