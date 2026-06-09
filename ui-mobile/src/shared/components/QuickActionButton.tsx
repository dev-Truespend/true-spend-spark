import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, tints, TintName, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type QuickActionButtonProps = {
  label: string;
  iconLabel?: string;
  iconNode?: React.ReactNode;
  tone?: TintName;
  onPress: () => void;
};

export function QuickActionButton({ label, iconLabel, iconNode, tone = "blue", onPress }: QuickActionButtonProps) {
  const t = tints[tone];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        {iconNode ?? <Text style={[styles.iconLabel, { color: t.fg }]}>{iconLabel ?? "+"}</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: palette.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    gap: 6
  },
  pressed: { opacity: 0.92, transform: [{ translateY: -1 }] },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  iconLabel: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14) },
  label: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(10), color: colors.text, textAlign: "center" }
});
