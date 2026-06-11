import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/shared/components/Screen";
import { Button } from "@/shared/components/Button";
import { Toast } from "@/shared/components/Toast";
import { OtpInput } from "@/shared/components/OtpInput";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";
import { useOtpVerification } from "@/features/auth/hooks/useOtpVerification";
import { useSignIn } from "@/features/auth/hooks/useSignIn";

const RESEND_SECONDS = 30;

export function OtpEntryScreen() {
  const params = useLocalSearchParams<{ value?: string; channel?: "email" | "phone" }>();
  const [token, setToken] = useState("");
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const { error, isLoading, verify } = useOtpVerification();
  const { isLoading: isResending, startOtp } = useSignIn();
  const value = params.value ?? "";
  const channel = params.channel === "phone" ? "phone" : "email";
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { colors } = theme;

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  async function handleResend() {
    if (!value || resendIn > 0 || isResending) return;
    setResendError(null);
    setResendNotice(null);
    try {
      await startOtp(value, channel);
      setResendIn(RESEND_SECONDS);
      setResendNotice("New code sent.");
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Could not resend code.");
    }
  }

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Verify code</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.hero}>
        <LinearGradient
          colors={[...theme.gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.illust, shadows.brandBlue]}
        >
          <Ionicons name="lock-closed" size={34} color={theme.palette.white} />
        </LinearGradient>
        <Text style={styles.title}>Enter the 6-digit code</Text>
        <Text style={styles.desc}>
          We sent it to <Text style={styles.value}>{value}</Text>.{" "}
          {channel === "phone" ? "Standard rates apply." : "Check your inbox."}
        </Text>
      </View>

      <OtpInput value={token} onChange={setToken} />

      <Text style={styles.resend}>
        Didn't get it?{" "}
        {resendIn > 0 ? (
          <Text style={styles.resendCount}>Resend in {resendIn}s</Text>
        ) : isResending ? (
          <Text style={styles.resendCount}>Sending…</Text>
        ) : (
          <Text style={styles.link} onPress={() => void handleResend()}>
            Resend code
          </Text>
        )}
      </Text>
      {resendNotice ? <Text style={styles.notice}>{resendNotice}</Text> : null}
      {resendError ? <Text style={styles.error}>{resendError}</Text> : null}

      <Button
        label={isLoading ? "Verifying…" : "Verify"}
        loading={isLoading}
        disabled={token.length < 6}
        onPress={() => void verify(value, token, channel)}
      />
      <Button label="Use a different method" variant="outline" onPress={() => router.back()} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      <View style={{ marginTop: 16 }}>
        <Toast message="TrueSpend never stores or sees your password. We use one-time codes only." />
      </View>
    </Screen>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    back: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
    topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
    hero: { alignItems: "center", paddingVertical: 12 },
    illust: {
      width: 80,
      height: 80,
      borderRadius: radii.hero,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14
    },
    title: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(20), color: t.colors.text, letterSpacing: -0.4 },
    desc: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.mutedFg, marginTop: 6, textAlign: "center", lineHeight: 19 },
    value: { fontFamily: fontFamily.bold, fontWeight: "700", color: t.colors.text },
    resend: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: t.colors.mutedFg, textAlign: "center" },
    resendCount: { fontFamily: fontFamily.semibold, color: t.colors.primary, fontWeight: "600" },
    link: { color: t.colors.primary, fontFamily: fontFamily.semibold, fontWeight: "600" },
    error: { color: t.colors.destructive, fontFamily: fontFamily.medium, textAlign: "center" },
    notice: { color: t.colors.primary, fontFamily: fontFamily.medium, fontSize: scaleFont(12), textAlign: "center" }
  });
