import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type BankRowProps = {
  name: string;
  meta?: string;
  logoLabel?: string;
  logoColor?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
};

export function BankRow({ name, meta, logoLabel, logoColor, onPress, trailing }: BankRowProps) {
  const t = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderWidth: 1,
        borderRadius: t.radii.lg
      },
      pressed: { opacity: 0.92, borderColor: t.colors.primary },
      logo: { width: 38, height: 38, borderRadius: t.radii.md, alignItems: "center", justifyContent: "center" },
      logoText: { color: t.palette.white, fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(12), letterSpacing: 0.3 },
      name: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(14), color: t.colors.text },
      meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, marginTop: 2 }
    })
  );
  const resolvedLogoColor = logoColor ?? t.colors.primary;
  const initials = logoLabel ?? name.slice(0, 2).toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.logo, { backgroundColor: resolvedLogoColor }]}>
        <Text style={styles.logoText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}
