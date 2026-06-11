import { StyleSheet } from "react-native";
import type { Theme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

// Theme-aware factory. Consumers call this through `useThemedStyles`.
export const buildOnboardingPanelStyles = (t: Theme) =>
  StyleSheet.create({
    panel: {
      backgroundColor: t.colors.surface,
      borderColor: t.colors.border,
      borderRadius: radii.xxl,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.md
    },
    heading: {
      color: t.colors.text,
      fontFamily: fontFamily.heavy,
      fontSize: scaleFont(20),
      fontWeight: "800",
      letterSpacing: -0.4
    },
    body: {
      color: t.colors.mutedFg,
      fontFamily: fontFamily.regular,
      fontSize: scaleFont(14),
      lineHeight: 20
    },
    label: {
      color: t.colors.text,
      fontFamily: fontFamily.semibold,
      fontSize: scaleFont(13),
      fontWeight: "600"
    },
    row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    listItem: { color: t.colors.text, fontFamily: fontFamily.regular, fontSize: scaleFont(14) }
  });
