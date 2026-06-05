import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { MissedReward } from "@/features/transactions/types/transactions.types";

type Props = {
  missedReward: MissedReward;
  onDismiss: (id: number) => void;
};

export function MissedRewardBanner({ missedReward, onDismiss }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Better card available</Text>
        <Text style={styles.detail}>
          You missed {missedReward.missedReward.formatted} using {missedReward.actualCard.displayName}.{" "}
          {missedReward.betterCard.displayName} would have earned {missedReward.potentialReward.formatted}.
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDismiss(missedReward.id)} style={styles.dismiss}>
        <Text style={styles.dismissText}>Not a miss</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF3F2",
    borderColor: colors.danger,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  body: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  detail: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18
  },
  dismiss: {
    justifyContent: "center"
  },
  dismissText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  }
});
