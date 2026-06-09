import { StyleSheet } from "react-native";
import { colors } from "@/shared/theme/colors";
import { radii, spacing } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

export const onboardingPanelStyles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xxl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  heading: {
    color: colors.text,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(20),
    fontWeight: "800",
    letterSpacing: -0.4
  },
  body: {
    color: colors.mutedFg,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(14),
    lineHeight: 20
  },
  label: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
    fontSize: scaleFont(13),
    fontWeight: "600"
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  listItem: { color: colors.text, fontFamily: fontFamily.regular, fontSize: scaleFont(14) }
});
