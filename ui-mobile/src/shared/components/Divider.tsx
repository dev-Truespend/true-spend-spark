import { StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type DividerProps = {
  label?: string;
};

export function Divider({ label }: DividerProps) {
  const styles = useThemedStyles(buildStyles);
  if (!label) {
    return <View style={styles.line} />;
  }
  return (
    <View style={styles.row}>
      <View style={styles.lineGrow} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.lineGrow} />
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    line: { height: 1, backgroundColor: t.colors.border, marginVertical: 8 },
    row: { flexDirection: "row", alignItems: "center", marginVertical: 14 },
    lineGrow: { flex: 1, height: 1, backgroundColor: t.colors.border },
    label: {
      marginHorizontal: 10,
      fontFamily: fontFamily.bold,
      fontWeight: "700",
      fontSize: scaleFont(10),
      color: t.colors.mutedFg,
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  });
