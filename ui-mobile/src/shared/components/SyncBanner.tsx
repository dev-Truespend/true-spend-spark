import { StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Tone = "info" | "warn" | "offline";

type SyncBannerProps = {
  tone?: Tone;
  message: string;
};

export function SyncBanner({ tone = "info", message }: SyncBannerProps) {
  const styles = useThemedStyles(buildStyles);
  const styleFor =
    tone === "warn"
      ? { bg: styles.warnBg, text: styles.warnText, dot: styles.warnDot }
      : tone === "offline"
        ? { bg: styles.offlineBg, text: styles.offlineText, dot: styles.offlineDot }
        : { bg: styles.infoBg, text: styles.infoText, dot: styles.infoDot };
  return (
    <View style={[styles.base, styleFor.bg]}>
      <View style={[styles.dot, styleFor.dot]} />
      <Text style={[styles.text, styleFor.text]}>{message}</Text>
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    text: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(11) },

    infoBg: { backgroundColor: t.tints.blue.bg, borderColor: t.tints.blue.bg },
    infoText: { color: t.colors.primary },
    infoDot: { backgroundColor: t.colors.primary },

    warnBg: { backgroundColor: t.tints.amber.bg, borderColor: t.tints.amber.bg },
    warnText: { color: t.colors.amberText },
    warnDot: { backgroundColor: t.colors.amber },

    offlineBg: { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border },
    offlineText: { color: t.colors.mutedFg },
    offlineDot: { backgroundColor: t.colors.mutedFg }
  });
