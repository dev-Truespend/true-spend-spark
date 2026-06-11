import { Pressable, StyleSheet, Text, View } from "react-native";
import { MissedReward } from "@/features/insights/types/analytics.types";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  item: MissedReward;
  onPress?: (item: MissedReward) => void;
};

export function MissedRewardCard({ item, onPress }: Props) {
  const styles = useThemedStyles(buildStyles);
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconGlyph}>⚠️</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.merchantName}
          {item.actualCard ? (
            <Text style={styles.titleMeta}> · {item.actualCard} instead of {item.betterCard}</Text>
          ) : null}
        </Text>
        <Text style={styles.meta}>
          {item.actualReward.display} earned · {item.potentialReward.display} possible
        </Text>
      </View>
      <Text style={styles.amount}>-{item.missedReward.display}</Text>
    </Pressable>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: t.tints.amber.wash,
      borderColor: t.tints.amber.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: 10
    },
    pressed: { opacity: 0.85 },
    icon: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: t.tints.amber.bg,
      alignItems: "center",
      justifyContent: "center"
    },
    iconGlyph: { fontSize: scaleFont(16) },
    title: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: t.colors.text },
    titleMeta: { fontFamily: fontFamily.regular, fontWeight: "400", fontSize: scaleFont(12), color: t.colors.mutedFg },
    meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, marginTop: 2 },
    amount: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: t.colors.amberText }
  });
