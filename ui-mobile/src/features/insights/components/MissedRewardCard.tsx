import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MissedReward } from "@/features/insights/types/analytics.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  item: MissedReward;
  onPress?: (item: MissedReward) => void;
};

export function MissedRewardCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.merchant} numberOfLines={1}>{item.merchantName}</Text>
        <Text style={styles.missed}>{item.missedReward.display} missed</Text>
      </View>
      {item.betterCard ? (
        <Text style={styles.suggestion}>
          Use {item.betterCard} instead of {item.actualCard ?? "current card"} next time
        </Text>
      ) : null}
      <View style={styles.rewardRow}>
        <Text style={styles.meta}>Earned: {item.actualReward.display}</Text>
        <Text style={styles.meta}>Could earn: {item.potentialReward.display}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  merchant: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: spacing.sm
  },
  missed: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700"
  },
  suggestion: {
    color: colors.muted,
    fontSize: 13
  },
  rewardRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  meta: {
    color: colors.muted,
    fontSize: 12
  }
});
