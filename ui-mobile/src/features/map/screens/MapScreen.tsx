import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

// Purely visual globe (Flighty-style). On iOS, a satellite MapView zoomed all
// the way out renders MapKit's 3D globe; the user can spin/zoom it. No pins,
// no data, no location prompt — it's a brand visual.
const GLOBE_CAMERA = {
  center: { latitude: 20, longitude: 0 },
  pitch: 0,
  heading: 0,
  altitude: 14_000_000,
  zoom: 0.9
};

export function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.fill}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        mapType="satellite"
        initialCamera={GLOBE_CAMERA}
        rotateEnabled
        pitchEnabled={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
      />

      <SafeAreaView edges={["top"]} style={styles.headerSafe} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
          <View style={styles.titlePill}>
            <Ionicons name="globe-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.title}>TrueSpend worldwide</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={styles.captionSafe} pointerEvents="none">
        <Text style={styles.caption}>Maximize every swipe — wherever you are.</Text>
      </SafeAreaView>
    </View>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    fill: { flex: 1, backgroundColor: "#000" },
    headerSafe: { position: "absolute", top: 0, left: 0, right: 0 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: t.spacing.md },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border
    },
    titlePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: t.colors.surface,
      borderRadius: t.radii.pill,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: t.colors.text },
    captionSafe: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingBottom: 16 },
    caption: {
      color: "rgba(255,255,255,0.85)",
      fontFamily: fontFamily.semibold,
      fontWeight: "600",
      fontSize: scaleFont(12),
      backgroundColor: "rgba(0,0,0,0.35)",
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      overflow: "hidden"
    }
  });
}
