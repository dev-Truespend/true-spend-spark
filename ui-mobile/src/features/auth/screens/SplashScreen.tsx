import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Button } from "@/shared/components/Button";
import { BrandMark } from "@/shared/components/BrandMark";
import { colors, gradients, palette } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useAuth } from "@/providers/AuthProvider";

export function SplashScreen() {
  const { isRestoring, bootstrapError, restoreSession } = useAuth();

  return (
    <LinearGradient
      colors={[...gradients.splash]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill}>
        <View style={styles.center}>
          <BrandMark size={84} translucent />
          <Text style={styles.title}>TrueSpend</Text>
          <Text style={styles.tagline}>
            Earn more on every purchase. The smart wallet for cardholders.
          </Text>
          {isRestoring ? (
            <ActivityIndicator color={palette.white} style={{ marginTop: 24 }} />
          ) : bootstrapError ? (
            <View style={styles.retry}>
              <Text style={styles.error}>{bootstrapError}</Text>
              <Button label="Try again" variant="light" onPress={restoreSession} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 16
  },
  title: {
    color: palette.white,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(36),
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 12
  },
  tagline: {
    color: colors.onBrandSoft,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(15),
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4
  },
  retry: { width: "100%", marginTop: 24, gap: 12, alignItems: "center" },
  error: { color: palette.white, fontFamily: fontFamily.semibold, textAlign: "center" }
});
