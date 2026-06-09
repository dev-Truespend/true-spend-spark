import { StyleSheet, Text, View } from "react-native";
import { colors, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Tone = "info" | "success" | "warn" | "error";

type ToastProps = {
  tone?: Tone;
  message: string;
  icon?: string;
};

const palettes: Record<Tone, { bg: string; border: string; iconBg: string; iconFg: string; defaultIcon: string }> = {
  info:    { bg: palette.white,                       border: colors.border,                       iconBg: colors.surfaceAlt,                  iconFg: colors.text,        defaultIcon: "i" },
  success: { bg: "rgba(34, 197, 94, 0.08)",          border: "rgba(34, 197, 94, 0.25)",          iconBg: colors.success,                     iconFg: palette.white,      defaultIcon: "✓" },
  warn:    { bg: "rgba(245, 147, 10, 0.10)",         border: "rgba(245, 147, 10, 0.30)",         iconBg: colors.amber,                       iconFg: palette.white,      defaultIcon: "!" },
  error:   { bg: "rgba(239, 68, 68, 0.08)",          border: "rgba(239, 68, 68, 0.25)",          iconBg: colors.destructive,                 iconFg: palette.white,      defaultIcon: "×" }
};

export function Toast({ tone = "info", message, icon }: ToastProps) {
  const p = palettes[tone];
  return (
    <View style={[styles.base, { backgroundColor: p.bg, borderColor: p.border }]}>
      <View style={[styles.icon, { backgroundColor: p.iconBg }]}>
        <Text style={[styles.iconText, { color: p.iconFg }]}>{icon ?? p.defaultIcon}</Text>
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1
  },
  icon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  iconText: { fontFamily: fontFamily.bold, fontSize: scaleFont(11), fontWeight: "700" },
  text: { flex: 1, fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: colors.text }
});
