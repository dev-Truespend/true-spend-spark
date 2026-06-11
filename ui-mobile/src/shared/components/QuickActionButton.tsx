import { Pressable, StyleSheet, Text, View } from "react-native";
import { TintName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type QuickActionButtonProps = {
  label: string;
  iconLabel?: string;
  iconNode?: React.ReactNode;
  tone?: TintName;
  onPress: () => void;
};

export function QuickActionButton({ label, iconLabel, iconNode, tone = "blue", onPress }: QuickActionButtonProps) {
  const theme = useTheme();
  const tint = theme.tints[tone];
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      btn: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 4,
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderWidth: 1,
        borderRadius: t.radii.lg,
        gap: 6
      },
      pressed: { opacity: 0.92, transform: [{ translateY: -1 }] },
      icon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
      iconLabel: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14) },
      label: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(10), color: t.colors.text, textAlign: "center" }
    })
  );
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: tint.bg }]}>
        {iconNode ?? <Text style={[styles.iconLabel, { color: tint.fg }]}>{iconLabel ?? "+"}</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
