import { Pressable, StyleSheet, Text, View } from "react-native";
import { MissedReward } from "@/features/transactions/types/transactions.types";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  missedReward: MissedReward;
  onDismiss: (id: number) => void;
};

export function MissedRewardBanner({ missedReward, onDismiss }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>💸 You could have earned more</Text>
      <Text style={styles.body}>
        {missedReward.betterCard.displayName} would have earned {missedReward.potentialReward.formatted} on this purchase.{" "}
        {missedReward.actualCard.displayName} earned less — a{" "}
        <Text style={styles.bold}>{missedReward.missedReward.formatted}</Text> miss.
      </Text>
      <Pressable accessibilityRole="button" onPress={() => onDismiss(missedReward.id)} hitSlop={6}>
        <Text style={styles.dismiss}>Mark as not-a-miss</Text>
      </Pressable>
    </View>
  );
}

const useStyles = () =>
  useThemedStyles((t) =>
    StyleSheet.create({
      card: {
        backgroundColor: t.tints.amber.bg,
        borderColor: t.tints.amber.border,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: 14,
        gap: 8
      },
      title: { fontFamily: fontFamily.bold, fontSize: scaleFont(13), fontWeight: "700", color: t.colors.amberText },
      body: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.text, lineHeight: 18 },
      bold: { fontFamily: fontFamily.bold, fontWeight: "700" },
      dismiss: {
        fontFamily: fontFamily.semibold,
        fontWeight: "600",
        fontSize: scaleFont(12),
        color: t.colors.mutedFg,
        alignSelf: "flex-start",
        marginTop: 4
      }
    })
  );
