import { StyleSheet, Text, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GradientName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

export type MiniCardSwatchVariant = Extract<GradientName, "brand" | "purple" | "cool" | "gold" | "dark">;

type Props = {
  label: string;
  variant?: MiniCardSwatchVariant;
  size?: number;
  style?: ViewStyle;
};

export function MiniCardSwatch({ label, variant = "brand", size = 44, style }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  return (
    <LinearGradient
      colors={[...theme.gradients[variant]]}
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

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    swatch: {
      padding: 6,
      overflow: "hidden",
      justifyContent: "flex-end"
    },
    label: {
      color: t.palette.white,
      fontFamily: fontFamily.bold,
      fontWeight: "700",
      fontSize: scaleFont(9),
      letterSpacing: 0.6,
      opacity: 0.85
    }
  });
