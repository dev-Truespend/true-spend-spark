import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GradientName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";

type ProgressBarProps = {
  value: number; // 0..1
  variant?: Extract<GradientName, "brand" | "warm" | "cool">;
  danger?: boolean;
  style?: ViewStyle;
};

export function ProgressBar({ value, variant = "brand", danger, style }: ProgressBarProps) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const v = Math.max(0, Math.min(1, value));
  const widthPct = `${Math.round(v * 100)}%` as const;
  return (
    <View style={[styles.track, style]}>
      {danger ? (
        <View style={[styles.fill, { width: widthPct, backgroundColor: theme.colors.destructive }]} />
      ) : (
        <LinearGradient
          colors={[...theme.gradients[variant]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: widthPct }]}
        />
      )}
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    track: {
      width: "100%",
      height: 6,
      borderRadius: 999,
      backgroundColor: t.colors.surfaceAlt,
      overflow: "hidden"
    },
    fill: { height: "100%", borderRadius: 999 }
  });
