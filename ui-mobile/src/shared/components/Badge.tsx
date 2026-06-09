import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { tints, TintName } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type BadgeProps = {
  label: string;
  tone?: TintName;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

export function Badge({ label, tone = "muted", icon, style }: BadgeProps) {
  const t = tints[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill
  },
  icon: { marginRight: 4 },
  label: { fontFamily: fontFamily.heavy, fontSize: scaleFont(11), fontWeight: "700", letterSpacing: 0.2 }
});
