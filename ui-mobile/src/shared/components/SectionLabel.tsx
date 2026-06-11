import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type SectionLabelProps = {
  children: string;
  accessory?: React.ReactNode;
  style?: ViewStyle;
};

export function SectionLabel({ children, accessory, style }: SectionLabelProps) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
      text: {
        fontFamily: fontFamily.bold,
        fontSize: scaleFont(11),
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
        color: t.colors.mutedFg
      },
      accessory: { marginLeft: 8 }
    })
  );
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.text}>{children}</Text>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}
