import { useCallback } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useAuth } from "@/providers/AuthProvider";
import { ProfileHeader } from "@/features/settings/components/ProfileHeader";
import { SectionHeader } from "@/features/settings/components/SectionHeader";
import { SettingsRow } from "@/features/settings/components/SettingsRow";
import { permissionLabel, permissionTone } from "@/features/settings/components/permission-label";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { toProfile } from "@/features/profile/mappers/profile.mapper";
import { usePermissions } from "@/features/permissions/hooks/usePermissions";
import { useSubscription } from "@/features/billing/hooks/useSubscription";

export function ProfileScreen() {
  const { bootstrap, isSigningOut, signOut } = useAuth();
  const profileQuery = useProfile();
  const permissionsQuery = usePermissions();
  const { subscription } = useSubscription();

  const profile = profileQuery.data ?? (bootstrap?.profile ? toProfile(bootstrap.profile) : null);
  const permissions = permissionsQuery.data ?? bootstrap?.permissions;

  const planBadge = subscription?.planCode ?? profile?.currentPlanCode ?? "basic";
  const planLabel = `${planBadge.charAt(0).toUpperCase()}${planBadge.slice(1)} plan`;

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const confirmSignOut = useCallback(() => {
    Alert.alert("Sign out?", "You will need to sign in again to access TrueSpend.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() }
    ]);
  }, [signOut]);

  if (!profile) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ProfileHeader profile={profile} />

        <SectionHeader title="Account" />
        <View style={styles.group}>
          <SettingsRow label="Plan" value={planLabel} onPress={() => router.push("/(app)/billing/plans" as never)} testID="profile.plan" />
          <SettingsRow label="Edit profile" onPress={() => router.push("/(app)/profile/edit" as never)} testID="profile.edit" />
        </View>

        <SectionHeader title="Linked" />
        <View style={styles.group}>
          <SettingsRow label="Cards" onPress={() => router.push("/(app)/(tabs)/cards" as never)} testID="profile.cards" />
          <SettingsRow label="Plaid connections" onPress={() => router.push("/(app)/cards/plaid-connections" as never)} testID="profile.plaid" />
        </View>

        <SectionHeader title="Preferences" />
        <View style={styles.group}>
          <SettingsRow label="Notifications" onPress={() => router.push("/(app)/notifications/settings" as never)} testID="profile.notifications" />
        </View>

        <SectionHeader title="Permissions" />
        <View style={styles.group}>
          <SettingsRow
            label="Location"
            value={permissions ? permissionLabel(permissions.location) : "—"}
            onPress={openSystemSettings}
            trailingTone={permissions ? permissionTone(permissions.location) : "muted"}
            testID="profile.location"
          />
          <SettingsRow
            label="Camera"
            value={permissions ? permissionLabel(permissions.camera) : "—"}
            onPress={openSystemSettings}
            trailingTone={permissions ? permissionTone(permissions.camera) : "muted"}
            testID="profile.camera"
          />
          <SettingsRow
            label="Notifications"
            value={permissions ? permissionLabel(permissions.notifications) : "—"}
            onPress={openSystemSettings}
            trailingTone={permissions ? permissionTone(permissions.notifications) : "muted"}
            testID="profile.notifications-permission"
          />
        </View>

        <View style={styles.signOut}>
          {isSigningOut ? <ActivityIndicator color={colors.primary} /> : null}
          <Button disabled={isSigningOut} label="Sign out" onPress={confirmSignOut} variant="danger" />
          <Text style={styles.footer}>{profile.email}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl
  },
  loader: {
    marginTop: spacing.xl
  },
  group: {
    gap: spacing.sm
  },
  signOut: {
    gap: spacing.md,
    marginTop: spacing.xl
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center"
  }
});
