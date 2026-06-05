import { StyleSheet, Text, View } from "react-native";
import { RewardsSummary } from "@/features/insights/types/analytics.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  summary: RewardsSummary;
};

export function RewardSummaryCard({ summary }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Earned</Text>
          <Text style={styles.metricValue}>{summary.earned.display}</Text>
          <Delta value={summary.earnedDelta.display} raw={summary.earnedDelta.amount} />
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Missed</Text>
          <Text style={[styles.metricValue, styles.missed]}>{summary.missed.display}</Text>
          <Delta value={summary.missedDelta.display} raw={summary.missedDelta.amount} negative />
        </View>
      </View>
    </View>
  );
}

function Delta({ value, raw, negative }: { value: string; raw: number; negative?: boolean }) {
  if (raw === 0) return null;
  const improved = negative ? raw < 0 : raw > 0;
  return (
    <Text style={[styles.delta, improved ? styles.deltaGood : styles.deltaBad]}>
      {raw > 0 ? "+" : ""}
      {value} vs prior
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md
  },
  row: {
    flexDirection: "row"
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  missed: {
    color: colors.danger
  },
  delta: {
    fontSize: 12,
    fontWeight: "500"
  },
  deltaGood: {
    color: colors.primary
  },
  deltaBad: {
    color: colors.danger
  }
});
