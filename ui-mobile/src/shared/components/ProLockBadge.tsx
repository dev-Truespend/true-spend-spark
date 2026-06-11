import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type ProLockBadgeProps = {
  label?: string;
  style?: ViewStyle;
};

// Mockup: gold gradient pill with ✦ glyph, used to mark Pro-gated entry points.
export function ProLockBadge({ label = "PRO", style }: ProLockBadgeProps) {
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={[styles.base, style]}>
      <Text style={styles.text}>✦ {label}</Text>
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    base: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.tints.gold.bg,
      borderColor: t.tints.gold.border,
      borderWidth: 1,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 2
    },
    text: {
      color: t.tints.gold.fg,
      fontFamily: fontFamily.heavy,
      fontSize: scaleFont(10),
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase"
    }
  });
