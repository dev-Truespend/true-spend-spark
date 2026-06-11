import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

function daysRemaining(trialEndsAt: string): number | null {
  const end = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(end)) return null;
  const remaining = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return remaining > 0 ? remaining : 0;
}

type Props = {
  // `onGlobe` floats the banner over the Wallet's satellite globe (dark in both
  // themes), so it uses a glass scrim + light text for contrast instead of the
  // theme-following amber tint.
  onGlobe?: boolean;
};

export function TrialBanner({ onGlobe = false }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { entitlements } = useEntitlements();
  if (!entitlements?.trialing) return null;

  const accent = onGlobe ? "#F4B860" : theme.colors.amberText;

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
      accessibilityLabel={`${label}. Tap to manage billing.`}
      style={({ pressed }) => [styles.banner, onGlobe && styles.bannerGlobe, pressed && styles.pressed]}
    >
      <Ionicons name="sparkles" size={14} color={accent} />
      <Text style={[styles.title, onGlobe && styles.titleGlobe]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.cta, onGlobe && { color: accent }]}>Manage</Text>
      <Ionicons name="chevron-forward" size={13} color={accent} />
    </Pressable>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: t.radii.pill,
      backgroundColor: t.tints.amber.bg,
      borderWidth: 1,
      borderColor: t.tints.amber.border
    },
    bannerGlobe: {
      backgroundColor: "rgba(18, 22, 30, 0.6)",
      borderColor: "rgba(244, 184, 96, 0.55)"
    },
    pressed: { opacity: 0.7 },
    title: { flex: 1, color: t.colors.text, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12) },
    titleGlobe: { color: t.palette.white },
    cta: { color: t.colors.amberText, fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(12) }
  });
}
