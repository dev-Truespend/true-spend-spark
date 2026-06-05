import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ label, onPress, disabled, variant = "primary" }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text style={[styles.label, variant !== "primary" && styles.darkLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
  },
  danger: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.85
  },
  label: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "700"
  },
  darkLabel: {
    color: colors.text
  }
});
