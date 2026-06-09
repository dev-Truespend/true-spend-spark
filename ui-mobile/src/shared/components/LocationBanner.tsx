import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, palette, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type LocationBannerProps = {
  title: string;
  meta?: string;
  iconLabel?: string;
};

export function LocationBanner({ title, meta, iconLabel = "📍" }: LocationBannerProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icon}
      >
        <Text style={styles.iconText}>{iconLabel}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: tints.blue.wash,
    borderColor: tints.blue.border,
    borderWidth: 1,
    borderRadius: radii.lg
  },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: scaleFont(14), color: palette.white },
  title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: colors.text },
  meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.mutedFg, marginTop: 1 }
});
