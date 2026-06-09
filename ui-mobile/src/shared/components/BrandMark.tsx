import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";

type BrandMarkProps = {
  size?: number;
  glyph?: string;
  style?: ViewStyle;
  translucent?: boolean; // for use on top of a gradient (e.g. splash)
};

export function BrandMark({ size = 48, glyph = "T", style, translucent = false }: BrandMarkProps) {
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
      colors={[...gradients.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center"
        },
        shadows.brandBlue,
        style
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.5 }]}>{glyph}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glyph: {
    color: palette.white,
    fontFamily: fontFamily.heavy,
    fontWeight: "800"
  }
});
