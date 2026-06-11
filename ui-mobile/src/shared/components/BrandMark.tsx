import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";

type BrandMarkProps = {
  size?: number;
  glyph?: string;
  style?: ViewStyle;
  translucent?: boolean; // for use on top of a gradient (e.g. splash)
};

export function BrandMark({ size = 48, glyph = "T", style, translucent = false }: BrandMarkProps) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const radius = Math.round(size * 0.28);
  if (translucent) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: "rgba(255,255,255,0.22)",
            alignItems: "center",
            justifyContent: "center"
          },
          style
        ]}
      >
        <Text style={[styles.glyph, { fontSize: size * 0.5 }]}>{glyph}</Text>
      </View>
    );
  }
  return (
    <LinearGradient
      colors={[...theme.gradients.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
          // Solid bg under the gradient lets RN compute the shadow efficiently.
          backgroundColor: theme.gradients.brand[0]
        },
        shadows.brandBlue,
        style
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.5 }]}>{glyph}</Text>
    </LinearGradient>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    glyph: {
      color: t.palette.white,
      fontFamily: fontFamily.heavy,
      fontWeight: "800"
    }
  });
