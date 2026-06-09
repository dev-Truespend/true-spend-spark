import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { Toast } from "@/shared/components/Toast";
import { useAuth } from "@/providers/AuthProvider";
import { useCancelAccountDeletion } from "@/features/privacy/hooks/useRequestAccountDeletion";
import { colors } from "@/shared/theme/colors";
import { radii, spacing } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

function formatPurgeDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function AccountReactivationScreen() {
  const { session, bootstrap, completeSignedInSession, signOut, isSigningOut } = useAuth();
  const cancelDeletion = useCancelAccountDeletion();
  const [error, setError] = useState<string | null>(null);

  const purgeDate = formatPurgeDate(bootstrap?.accountDeletion?.purgeAfter);

  async function handleReactivate() {
    setError(null);
    try {
      await cancelDeletion.mutateAsync();
      // Re-bootstrap so the (now cleared) deletion state routes the user back into the app.
      if (session) await completeSignedInSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reactivate your account. Please try again.");
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.body}>
          Your account is scheduled to be permanently deleted
          {purgeDate ? <Text style={styles.bodyStrong}> on {purgeDate}</Text> : null}. Reactivate now to keep
          your account and all your data.
        </Text>

        {error ? <Toast tone="error" message={error} /> : null}

        <View style={styles.actions}>
          <Button
            label="Reactivate my account"
            onPress={handleReactivate}
            loading={cancelDeletion.isPending}
            disabled={cancelDeletion.isPending || isSigningOut}
          />
          <Button
            label="Sign out"
            variant="ghost"
            onPress={() => void signOut()}
            disabled={cancelDeletion.isPending || isSigningOut}
          />
        </View>

        <Text style={styles.footnote}>
          If you do nothing, your account and data will be erased on the scheduled date.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.hero,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center"
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { fontSize: scaleFont(30) },
  title: {
    color: colors.text,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(22),
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center"
  },
  body: {
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    textAlign: "center"
  },
  bodyStrong: { color: colors.text, fontFamily: fontFamily.semibold, fontWeight: "600" },
  actions: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.xs },
  footnote: {
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(12),
    lineHeight: scaleFont(17),
    textAlign: "center",
    opacity: 0.8
  }
});
