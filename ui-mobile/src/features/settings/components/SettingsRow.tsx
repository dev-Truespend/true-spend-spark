import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  label: string;
  value?: string;
  onPress?: () => void;
  testID?: string;
  trailingTone?: "default" | "muted" | "warning" | "danger";
  disabled?: boolean;
};

export function SettingsRow({ label, value, onPress, testID, trailingTone = "default", disabled }: Props) {
  const tone = styles[`tone_${trailingTone}` as const];
  const content = (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <View style={styles.right}>
        {value ? <Text style={[styles.value, tone]} numberOfLines={1}>{value}</Text> : null}
        {onPress && !disabled ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </View>
  );

  if (!onPress || disabled) {
    return <View testID={testID} style={[styles.container, disabled && styles.disabled]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  pressed: {
    opacity: 0.7
  },
  disabled: {
    opacity: 0.55
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "500"
  },
  right: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginLeft: spacing.md,
    maxWidth: "55%"
  },
  value: {
    color: colors.muted,
    fontSize: 14
  },
  chevron: {
    color: colors.muted,
    fontSize: 20
  },
  tone_default: {
    color: colors.muted
  },
  tone_muted: {
    color: colors.muted
  },
  tone_warning: {
    color: "#B5651D"
  },
  tone_danger: {
    color: colors.danger
  }
});
