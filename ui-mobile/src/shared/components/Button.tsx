import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, palette } from "@/shared/theme/colors";
import { radii, spacing } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";

type Variant = "primary" | "secondary" | "dark" | "light" | "outline" | "ghost" | "danger";
type Size = "md" | "sm";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  testID?: string;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  block = true,
  leftIcon,
  rightIcon,
  testID
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const fg = textColorFor(variant);
  const sizeStyle = size === "sm" ? styles.sm : styles.md;
  const widthStyle: ViewStyle = block ? { alignSelf: "stretch" } : { alignSelf: "flex-start" };

  const content = (
    <View style={styles.contentRow}>
      {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.label, size === "sm" && styles.labelSm, { color: fg }]}>{label}</Text>
      )}
      {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
    </View>
  );

  if (variant === "primary") {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          widthStyle,
          shadows.brandBlue,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed
        ]}
      >
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, sizeStyle]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        widthStyle,
        backgroundFor(variant),
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed
      ]}
    >
      {content}
    </Pressable>
  );
}

function textColorFor(v: Variant): string {
  switch (v) {
    case "primary":
    case "dark":
      return palette.white;
    case "danger":
      return colors.destructive;
    case "ghost":
      return colors.primary;
    case "outline":
    case "light":
    default:
      return colors.text;
  }
}

function backgroundFor(v: Variant): ViewStyle {
  switch (v) {
    case "secondary":
      return { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 };
    case "dark":
      return { backgroundColor: palette.black };
    case "light":
      return { backgroundColor: palette.white, borderColor: colors.border, borderWidth: 1, ...shadows.card };
    case "outline":
      return { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 1 };
    case "ghost":
      return { backgroundColor: "transparent" };
    case "danger":
      return { backgroundColor: palette.white, borderColor: colors.destructive, borderWidth: 1 };
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.lg,
    justifyContent: "center"
  },
  md: { minHeight: 46, paddingHorizontal: spacing.md, paddingVertical: 13 },
  sm: { minHeight: 36, paddingHorizontal: 14, paddingVertical: 8 },
  contentRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { fontFamily: fontFamily.semibold, fontSize: scaleFont(14), fontWeight: "600", letterSpacing: -0.1 },
  labelSm: { fontSize: scaleFont(13) },
  iconLeft: { marginRight: 0 },
  iconRight: { marginLeft: 0 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] }
});
