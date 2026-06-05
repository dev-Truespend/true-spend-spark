import { StyleSheet, Text, View } from "react-native";
import { RewardBreakdownItem } from "@/features/insights/types/analytics.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  items: RewardBreakdownItem[];
};

export function CategoryBreakdownList({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>By category</Text>
      {items.map((item) => (
        <View key={item.key} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <View style={styles.amounts}>
            <Text style={styles.earned}>{item.earned.display}</Text>
            <Text style={styles.missed}>{item.missed.display} missed</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  heading: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 1
  },
  amounts: {
    alignItems: "flex-end"
  },
  earned: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700"
  },
  missed: {
    color: colors.muted,
    fontSize: 12
  }
});
