import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

function daysRemaining(trialEndsAt: string): number | null {
  const end = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(end)) return null;
  const remaining = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return remaining > 0 ? remaining : 0;
}

export function TrialBanner() {
  const router = useRouter();
  const { entitlements } = useEntitlements();
  if (!entitlements?.trialing) return null;

  const days = entitlements.trialEndsAt ? daysRemaining(entitlements.trialEndsAt) : null;
  const label = days === null
    ? "Pro trial active"
    : days === 0
      ? "Trial ends today"
      : days === 1
        ? "1 day left in Pro trial"
        : `${days} days left in Pro trial`;

  return (
    <Pressable
      onPress={() => router.push("/(app)/billing")}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.cta}>Manage</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  label: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },
  cta: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    textDecorationLine: "underline"
  }
});
