import { StyleSheet, Text } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

export function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.text}>{title}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
    textTransform: "uppercase"
  }
});
