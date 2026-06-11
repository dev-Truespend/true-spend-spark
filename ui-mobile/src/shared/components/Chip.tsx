import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { spacing } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
};

export function Chip({ label, active, onPress, icon }: ChipProps) {
  const theme = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      base: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: t.radii.pill,
        borderWidth: 1,
        borderColor: "transparent"
      },
      inactive: { backgroundColor: t.colors.surfaceAlt },
      pressed: { opacity: 0.85 },
      icon: { marginRight: 4 },
      label: { fontFamily: fontFamily.semibold, fontSize: scaleFont(12), fontWeight: "600" },
      activeLabel: { color: t.palette.white },
      inactiveLabel: { color: t.colors.text }
    })
  );
  if (active) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: true }}>
        <LinearGradient
          colors={[...theme.gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, styles.activeLabel]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: false }}
      style={({ pressed }) => [styles.base, styles.inactive, pressed && styles.pressed]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, styles.inactiveLabel]}>{label}</Text>
    </Pressable>
  );
}

type ChipRowProps = {
  children: React.ReactNode;
};

export function ChipRow({ children }: ChipRowProps) {
  return <View style={rowStyles.row}>{children}</View>;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 6,
    paddingRight: spacing.md
  }
});
