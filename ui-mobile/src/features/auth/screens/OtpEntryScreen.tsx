import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useOtpVerification } from "@/features/auth/hooks/useOtpVerification";
import { OtpInput } from "@/features/auth/components/OtpInput";

export function OtpEntryScreen() {
  const params = useLocalSearchParams<{ value?: string; channel?: "email" | "phone" }>();
  const [token, setToken] = useState("");
  const { error, isLoading, verify } = useOtpVerification();
  const value = params.value ?? "";
  const channel = params.channel === "phone" ? "phone" : "email";

  return (
    <Screen>
      <Text style={styles.title}>Enter verification code</Text>
      <Text style={styles.subtitle}>{value}</Text>
      <OtpInput
        disabled={isLoading}
        token={token}
        onChange={setToken}
        onSubmit={() => void verify(value, token, channel)}
      />
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: spacing.xl
  },
  subtitle: {
    color: colors.muted
  },
  error: {
    color: colors.danger
  }
});
