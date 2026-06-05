import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useAuth } from "@/providers/AuthProvider";

export function SplashScreen() {
  const { isRestoring, bootstrapError, restoreSession } = useAuth();

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.logo}>TrueSpend</Text>
        {isRestoring ? <ActivityIndicator color={colors.primary} /> : (
          <>
            {bootstrapError ? <Text style={styles.error}>{bootstrapError}</Text> : null}
            <Button label="Try again" onPress={restoreSession} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center"
  },
  logo: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800"
  },
  error: {
    color: colors.danger,
    textAlign: "center"
  }
});
