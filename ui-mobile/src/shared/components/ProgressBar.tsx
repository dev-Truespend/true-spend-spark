import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, GradientName } from "@/shared/theme/colors";

type ProgressBarProps = {
  value: number; // 0..1
  variant?: Extract<GradientName, "brand" | "warm" | "cool">;
  danger?: boolean;
  style?: ViewStyle;
};

export function ProgressBar({ value, variant = "brand", danger, style }: ProgressBarProps) {
  const v = Math.max(0, Math.min(1, value));
  const widthPct = `${Math.round(v * 100)}%` as const;
  return (
    <View style={[styles.track, style]}>
      {danger ? (
        <View style={[styles.fill, { width: widthPct, backgroundColor: colors.destructive }]} />
      ) : (
        <LinearGradient
          colors={[...gradients[variant]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: widthPct }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden"
  },
  fill: { height: "100%", borderRadius: 999 }
});
