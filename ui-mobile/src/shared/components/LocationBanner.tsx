import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type LocationBannerProps = {
  title: string;
  meta?: string;
  iconLabel?: string;
};

export function LocationBanner({ title, meta, iconLabel = "📍" }: LocationBannerProps) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...theme.gradients.brand]}
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

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: t.tints.blue.wash,
      borderColor: t.tints.blue.border,
      borderWidth: 1,
      borderRadius: radii.lg
    },
    icon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    iconText: { fontSize: scaleFont(14), color: t.palette.white },
    title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: t.colors.text },
    meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, marginTop: 1 }
  });
