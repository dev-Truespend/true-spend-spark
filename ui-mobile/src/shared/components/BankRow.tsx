import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type BankRowProps = {
  name: string;
  meta?: string;
  logoLabel?: string;
  logoColor?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
};

export function BankRow({ name, meta, logoLabel, logoColor = colors.primary, onPress, trailing }: BankRowProps) {
  const initials = logoLabel ?? name.slice(0, 2).toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.logo, { backgroundColor: logoColor }]}>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: palette.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg
  },
  pressed: { opacity: 0.92, borderColor: colors.primary },
  logo: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  logoText: { color: palette.white, fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(12), letterSpacing: 0.3 },
  name: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(14), color: colors.text },
  meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.mutedFg, marginTop: 2 }
});
