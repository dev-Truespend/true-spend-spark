import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useSignIn } from "@/features/auth/hooks/useSignIn";
import { IdentifierForm } from "@/features/auth/components/IdentifierForm";
import { SocialProviderButtons } from "@/features/auth/components/SocialProviderButtons";

export function SignInScreen() {
  const [identifier, setIdentifier] = useState("");
  const { error, isLoading, startOtp, startProvider } = useSignIn();

  async function submitOtp() {
    const channel = identifier.includes("@") ? "email" : "phone";
    await startOtp(identifier.trim(), channel);
    router.push({ pathname: "/(auth)/verify", params: { value: identifier.trim(), channel } });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>TrueSpend</Text>
        <Text style={styles.subtitle}>Sign in to keep your cards, recommendations, and rewards in sync.</Text>
      </View>
      <SocialProviderButtons
        disabled={isLoading}
        onApple={() => void startProvider("apple")}
        onGoogle={() => void startProvider("google")}
      />
      <IdentifierForm
        disabled={isLoading}
        identifier={identifier}
        onChange={setIdentifier}
        onSubmit={() => void submitOtp()}
      />
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginTop: spacing.xl
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22
  },
  error: {
    color: colors.danger
  }
});
