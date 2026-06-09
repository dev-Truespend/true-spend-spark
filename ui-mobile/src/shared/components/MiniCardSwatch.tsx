import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, GradientName, palette } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

export type MiniCardSwatchVariant = Extract<GradientName, "brand" | "purple" | "cool" | "gold" | "dark">;

type Props = {
  label: string;
  variant?: MiniCardSwatchVariant;
  size?: number;
  style?: ViewStyle;
};

export function MiniCardSwatch({ label, variant = "brand", size = 44, style }: Props) {
  return (
    <LinearGradient
      colors={[...gradients[variant]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.swatch, { width: size, height: size, borderRadius: Math.round(size / 4.9) }, style]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  swatch: {
    padding: 6,
    overflow: "hidden",
    justifyContent: "flex-end"
  },
  label: {
    color: palette.white,
    fontFamily: fontFamily.bold,
    fontWeight: "700",
    fontSize: scaleFont(9),
    letterSpacing: 0.6,
    opacity: 0.85
  }
});
