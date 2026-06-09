import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Tone = "default" | "muted" | "warning" | "danger";

type Props = {
  label: string;
  value?: string;
  onPress?: () => void;
  testID?: string;
  trailingTone?: Tone;
  disabled?: boolean;
};

export function SettingsRow({ label, value, onPress, testID, trailingTone = "default", disabled }: Props) {
  const toneStyle = trailingTone === "warning"
    ? styles.tone_warning
    : trailingTone === "danger"
      ? styles.tone_danger
      : styles.tone_muted;
  const content = (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <View style={styles.right}>
        {value ? <Text style={[styles.value, toneStyle]} numberOfLines={1}>{value}</Text> : null}
        {onPress && !disabled ? (
          <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
        ) : null}
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
    backgroundColor: palette.white,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: colors.text, flexShrink: 1, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(14) },
  right: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 12, maxWidth: "55%" },
  value: { fontFamily: fontFamily.regular, fontSize: scaleFont(12) },
  tone_muted: { color: colors.mutedFg },
  tone_warning: { color: colors.amberText },
  tone_danger: { color: colors.destructive }
});
