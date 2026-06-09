import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, GradientName, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";

type GradientHeroCardProps = {
  tag?: string;
  title: string;
  subtitle?: string;
  amount?: string;
  amountLabel?: string;
  cardName?: string;
  cardNumber?: string;
  gradient?: Extract<GradientName, "brand" | "warm" | "cool" | "dark" | "purple">;
  style?: ViewStyle;
  footer?: ReactNode;
};

export function GradientHeroCard({
  tag,
  title,
  subtitle,
  amount,
  amountLabel = "estimated reward",
  cardName,
  cardNumber,
  gradient = "brand",
  style,
  footer
}: GradientHeroCardProps) {
  const colorPair = gradients[gradient];
  const shadow = gradient === "warm" ? shadows.brandWarm : gradient === "purple" ? shadows.brandPurple : shadows.brandBlue;
  return (
    <LinearGradient
      colors={[...colorPair]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, shadow, style]}
    >
      {tag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {amount ? (
        <View style={styles.earnRow}>
          <Text style={styles.earnAmount}>{amount}</Text>
          <Text style={styles.earnLabel}>{amountLabel}</Text>
        </View>
      ) : null}
      {(cardName || cardNumber || footer) ? (
        <View style={styles.footer}>
          {footer ?? (
            <>
              <Text style={styles.cardName}>{cardName}</Text>
              <Text style={styles.cardNum}>{cardNumber}</Text>
            </>
          )}
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.hero,
    padding: 18,
    overflow: "hidden"
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 10
  },
  tagText: {
    color: palette.white,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(10),
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  title: {
    color: palette.white,
    fontFamily: fontFamily.bold,
    fontSize: scaleFont(17),
    fontWeight: "700",
    letterSpacing: -0.2
  },
  subtitle: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(13),
    marginTop: 4,
    lineHeight: 18
  },
  earnRow: { flexDirection: "row", alignItems: "baseline", marginTop: 12, gap: 6 },
  earnAmount: {
    color: palette.white,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(28),
    fontWeight: "800",
    letterSpacing: -0.6
  },
  earnLabel: { color: "rgba(255,255,255,0.85)", fontSize: scaleFont(11), fontFamily: fontFamily.medium },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardName: { color: palette.white, fontFamily: fontFamily.semibold, fontSize: scaleFont(12), fontWeight: "600" },
  cardNum: { color: "rgba(255,255,255,0.85)", fontFamily: fontFamily.mono, fontSize: scaleFont(12), letterSpacing: 1.4 }
});
