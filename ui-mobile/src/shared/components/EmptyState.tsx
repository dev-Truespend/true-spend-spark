import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, colors } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type EmptyStateProps = {
  icon?: ReactNode;
  iconLabel?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, iconLabel, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...gradients.blueWash]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ill}
      >
        {icon ?? <Text style={styles.illGlyph}>{iconLabel ?? "✨"}</Text>}
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 24, gap: 8 },
  ill: {
    width: 86,
    height: 86,
    borderRadius: radii.hero,
    alignItems: "center",
    justifyContent: "center"
  },
  illGlyph: { fontSize: scaleFont(36) },
  title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(16), color: colors.text, marginTop: 12 },
  desc: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: colors.mutedFg, textAlign: "center", lineHeight: 20, marginHorizontal: 12 },
  action: { alignSelf: "stretch", marginTop: 12 }
});
