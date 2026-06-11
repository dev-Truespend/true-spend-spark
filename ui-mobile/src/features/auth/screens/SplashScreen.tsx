import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Button } from "@/shared/components/Button";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useAuth } from "@/providers/AuthProvider";

const LOGO = require("../../../../assets/icon.png");

export function SplashScreen() {
  const { isRestoring, bootstrapError, restoreSession } = useAuth();
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);

  return (
    <LinearGradient
      colors={[...theme.gradients.launch]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill}>
        <View style={styles.center}>
          {/* Glowing app icon, byteai-style. */}
          <View style={styles.glow}>
            <Image source={LOGO} style={styles.logo} resizeMode="cover" />
          </View>
          <Text style={styles.title}>TrueSpend</Text>
          <Text style={styles.tagline}>Maximize every swipe</Text>
          {isRestoring ? (
            <ActivityIndicator color={theme.palette.white} style={{ marginTop: 32 }} />
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

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    fill: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
      gap: 18
    },
    // Soft purple halo behind the icon — the "glowing icon" launch look.
    glow: {
      borderRadius: 34,
      backgroundColor: t.palette.brandPurple,
      shadowColor: t.palette.brandPurple,
      shadowOpacity: 0.95,
      shadowRadius: 38,
      shadowOffset: { width: 0, height: 0 },
      elevation: 24
    },
    logo: {
      width: 132,
      height: 132,
      borderRadius: 34
    },
    title: {
      color: t.palette.white,
      fontFamily: fontFamily.heavy,
      fontSize: scaleFont(40),
      fontWeight: "800",
      letterSpacing: -0.8,
      marginTop: 24
    },
    tagline: {
      color: t.colors.onBrandSoft,
      fontFamily: fontFamily.bold,
      fontWeight: "700",
      fontSize: scaleFont(16),
      textAlign: "center",
      letterSpacing: 3,
      textTransform: "uppercase",
      marginTop: 2
    },
    retry: { width: "100%", marginTop: 24, gap: 12, alignItems: "center" },
    error: { color: t.palette.white, fontFamily: fontFamily.semibold, textAlign: "center" }
  });
