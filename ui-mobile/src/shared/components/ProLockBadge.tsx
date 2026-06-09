import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type ProLockBadgeProps = {
  label?: string;
  style?: ViewStyle;
};

// Mockup: gold gradient pill with ✦ glyph, used to mark Pro-gated entry points.
export function ProLockBadge({ label = "PRO", style }: ProLockBadgeProps) {
  return (
    <View style={[styles.base, style]}>
      <Text style={styles.text}>✦ {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tints.gold.bg,
    borderColor: tints.gold.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  text: {
    color: tints.gold.fg,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(10),
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  }
});
