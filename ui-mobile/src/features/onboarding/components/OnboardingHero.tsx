import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, GradientName, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";

type OnboardingHeroProps = {
  iconLabel?: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  gradient?: Extract<GradientName, "brand" | "warm" | "cool" | "purple">;
  size?: "md" | "sm";
  style?: ViewStyle;
};

export function OnboardingHero({
  iconLabel,
  icon,
  title,
  description,
  gradient = "brand",
  size = "md",
  style
}: OnboardingHeroProps) {
  const illSize = size === "sm" ? 80 : 100;
  const radius = size === "sm" ? 22 : 26;
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={[...gradients[gradient]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            width: illSize,
            height: illSize,
            borderRadius: radius
          },
          styles.ill,
          gradient === "purple" ? shadows.brandPurple : gradient === "warm" ? shadows.brandWarm : shadows.brandBlue
        ]}
      >
        {icon ?? <Text style={[styles.illGlyph, size === "sm" && { fontSize: scaleFont(32) }]}>{iconLabel ?? "✨"}</Text>}
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 14, gap: 4 },
  ill: { alignItems: "center", justifyContent: "center", marginBottom: 12 },
  illGlyph: { fontSize: scaleFont(40) },
  title: {
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(22),
    fontWeight: "800",
    color: palette.black,
    letterSpacing: -0.4,
    textAlign: "center"
  },
  desc: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(13),
    lineHeight: 19,
    color: colors.onLightSoft,
    textAlign: "center",
    paddingHorizontal: 14
  }
});
