import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/shared/components/Button";
import { colors, gradients, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type ProUpsellProps = {
  title: string;
  body: string;
  ctaLabel?: string;
  onPress: () => void;
  style?: ViewStyle;
  compact?: boolean;
};

// Shared paywall callout for Pro-gated features. Replaces ad-hoc upgrade
// cards across Insights, Cards empty state, Home, etc.
export function ProUpsell({
  title,
  body,
  ctaLabel = "Upgrade to Pro",
  onPress,
  style,
  compact
}: ProUpsellProps) {
  return (
    <LinearGradient
      colors={[...gradients.goldWash]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, compact && styles.wrapCompact, style]}
    >
      <Text style={styles.title}>✦ {title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.action}>
        <Button label={ctaLabel} onPress={onPress} size="sm" block={false} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    borderColor: tints.gold.border,
    borderWidth: 1,
    padding: 14,
    gap: 6
  },
  wrapCompact: { padding: 10 },
  title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14), color: colors.amberText },
  body: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: colors.mutedFg, lineHeight: 17 },
  action: { alignSelf: "flex-start", marginTop: 6 }
});
