import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/shared/components/Screen";
import { BrandMark } from "@/shared/components/BrandMark";
import { Button } from "@/shared/components/Button";
import { Divider } from "@/shared/components/Divider";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useSignIn } from "@/features/auth/hooks/useSignIn";
import { IdentifierForm } from "@/features/auth/components/IdentifierForm";
import { SocialProviderButtons } from "@/features/auth/components/SocialProviderButtons";

type Mode = "providers" | "phone" | "email";

export function SignInScreen() {
  const [mode, setMode] = useState<Mode>("providers");
  const [identifier, setIdentifier] = useState("");
  const { error, isLoading, startOtp, startProvider } = useSignIn();

  async function submitOtp() {
    const channel: "email" | "phone" = mode === "phone" ? "phone" : "email";
    await startOtp(identifier.trim(), channel);
    router.push({ pathname: "/(auth)/verify", params: { value: identifier.trim(), channel } });
  }

  function chooseChannel(next: "phone" | "email") {
    setIdentifier("");
    setMode(next);
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <BrandMark size={56} />
        <Text style={styles.title}>
          Welcome to <Text style={styles.titleAccent}>TrueSpend</Text>
        </Text>
        <Text style={styles.subtitle}>
          Sign in to start earning more on every purchase.
        </Text>
      </View>

      {mode === "providers" ? (
        <>
          <SocialProviderButtons
            disabled={isLoading}
            onApple={() => void startProvider("apple")}
            onGoogle={() => void startProvider("google")}
            onPhone={() => chooseChannel("phone")}
          />
          <Divider label="or" />
          <Button
            disabled={isLoading}
            label="Sign in with email"
            onPress={() => chooseChannel("email")}
            variant="outline"
            leftIcon={<Ionicons name="mail-outline" size={16} color={colors.text} />}
          />
        </>
      ) : (
        <>
          <Pressable onPress={() => setMode("providers")} hitSlop={8} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={colors.mutedFg} />
            <Text style={styles.backLabel}>Other sign-in options</Text>
          </Pressable>
          <IdentifierForm
            channel={mode}
            disabled={isLoading}
            identifier={identifier}
            onChange={setIdentifier}
            onSubmit={() => void submitOtp()}
          />
          <Text style={styles.helper}>
            {mode === "phone"
              ? "We'll text a 6-digit code. Standard rates apply."
              : "We'll email a 6-digit code. No password needed."}
          </Text>
        </>
      )}

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.terms}>
        By continuing, you agree to our{" "}
        <Text style={styles.link}>Terms</Text> and{" "}
        <Text style={styles.link}>Privacy Policy</Text>.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(26),
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center"
  },
  titleAccent: {
    color: colors.accent
  },
  subtitle: {
    color: colors.mutedFg,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(14),
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 16
  },
  error: { color: colors.destructive, fontFamily: fontFamily.medium, textAlign: "center" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  backLabel: { color: colors.mutedFg, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12) },
  helper: { color: colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(12), textAlign: "center" },
  terms: {
    color: colors.mutedFg,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(11),
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
    paddingHorizontal: 12
  },
  link: { color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: "600" }
});
