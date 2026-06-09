import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { colors, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

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
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.banner}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>✦ {label}</Text>
        <Text style={styles.body}>Tap to manage billing or upgrade.</Text>
      </View>
      <Text style={styles.cta}>Manage →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: tints.amber.bg,
    borderWidth: 1,
    borderColor: tints.amber.border
  },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13) },
  body: { color: colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(11), marginTop: 2 },
  cta: { color: colors.amberText, fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(12) }
});
