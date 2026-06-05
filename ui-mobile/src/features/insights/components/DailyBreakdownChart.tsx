import { StyleSheet, Text, View } from "react-native";
import { RewardBreakdownItem } from "@/features/insights/types/analytics.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  items: RewardBreakdownItem[];
};

export function DailyBreakdownChart({ items }: Props) {
  if (items.length === 0) return null;

  const max = items.reduce((m, item) => Math.max(m, item.earned.amount), 0);
  const safeMax = max > 0 ? max : 1;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Daily earnings</Text>
      <View style={styles.chart}>
        {items.map((item) => {
          const ratio = Math.max(0.04, item.earned.amount / safeMax);
          return (
            <View key={item.key} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View style={[styles.bar, { height: `${ratio * 100}%` }]} />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  heading: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  chart: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
    height: 120
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    justifyContent: "flex-end"
  },
  barWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%"
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    width: "100%"
  },
  barLabel: {
    color: colors.muted,
    fontSize: 9
  }
});
