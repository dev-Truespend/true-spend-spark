import { StyleSheet } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

export const onboardingPanelStyles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  label: { color: colors.text, fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  listItem: { color: colors.text }
});
