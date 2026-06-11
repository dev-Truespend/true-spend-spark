import { StyleSheet, Text, View } from "react-native";
import { TintName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type RewardRowProps = {
  label: string;
  multiplier: string;
  iconLabel?: string;
  iconTone?: TintName;
  multiplierTone?: TintName;
  divider?: boolean;
};

export function RewardRow({ label, multiplier, iconLabel = "•", iconTone = "muted", multiplierTone = "blue", divider = true }: RewardRowProps) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const t = theme.tints[iconTone];
  const m = theme.tints[multiplierTone];
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.left}>
        <View style={[styles.icon, { backgroundColor: t.bg }]}>
          <Text style={[styles.iconLabel, { color: t.fg }]}>{iconLabel}</Text>
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.multiplier, { color: m.fg }]}>{multiplier}</Text>
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9 },
    divider: { borderBottomWidth: 1, borderBottomColor: t.colors.border },
    left: { flexDirection: "row", alignItems: "center", gap: 10 },
    icon: { width: 32, height: 32, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
    iconLabel: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13) },
    label: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: t.colors.text },
    multiplier: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(16), letterSpacing: -0.4 }
  });
