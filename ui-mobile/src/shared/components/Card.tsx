import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useThemedStyles } from "@/providers/ThemeProvider";

type CardProps = PropsWithChildren<{
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  tone?: "default" | "muted";
}>;

export function Card({ children, onPress, style, padded = true, tone = "default" }: CardProps) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      base: { borderRadius: t.radii.xxl, borderWidth: 1 },
      default: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
      muted: { backgroundColor: t.colors.surfaceAlt, borderColor: "transparent" },
      padded: { padding: t.spacing.md - 2 },
      pressed: { opacity: 0.92, transform: [{ scale: 0.997 }] }
    })
  );

  const innerStyle = [
    styles.base,
    tone === "muted" ? styles.muted : styles.default,
    padded && styles.padded,
    style
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...innerStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={innerStyle}>{children}</View>;
}
