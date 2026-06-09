import { StyleSheet, Text, View } from "react-native";
import { colors, tints } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Tone = "info" | "warn" | "offline";

type SyncBannerProps = {
  tone?: Tone;
  message: string;
};

export function SyncBanner({ tone = "info", message }: SyncBannerProps) {
  const styleFor = tone === "warn" ? warnStyles : tone === "offline" ? offlineStyles : infoStyles;
  return (
    <View style={[styles.base, styleFor.bg]}>
      <View style={[styles.dot, styleFor.dot]} />
      <Text style={[styles.text, styleFor.text]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  text: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(11) }
});

const infoStyles = StyleSheet.create({
  bg:   { backgroundColor: tints.blue.bg, borderColor: tints.blue.bg },
  text: { color: colors.primary },
  dot:  { backgroundColor: colors.primary }
});

const warnStyles = StyleSheet.create({
  bg:   { backgroundColor: tints.amber.bg, borderColor: tints.amber.bg },
  text: { color: colors.amberText },
  dot:  { backgroundColor: colors.amber }
});

const offlineStyles = StyleSheet.create({
  bg:   { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  text: { color: colors.mutedFg },
  dot:  { backgroundColor: colors.mutedFg }
});
