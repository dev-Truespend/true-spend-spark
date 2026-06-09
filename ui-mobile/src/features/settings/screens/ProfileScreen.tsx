import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { ListItem } from "@/shared/components/ListItem";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Switch } from "@/shared/components/Switch";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useAuth } from "@/providers/AuthProvider";
import { ProfileHeader } from "@/features/settings/components/ProfileHeader";
import { permissionLabel } from "@/features/settings/components/permission-label";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { toProfile } from "@/features/profile/mappers/profile.mapper";
import { usePermissions } from "@/features/permissions/hooks/usePermissions";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useNotificationSettings } from "@/features/notification-settings/hooks/useNotificationSettings";
import { usePreferences } from "@/features/preferences/hooks/usePreferences";
import { useUpdatePreferences } from "@/features/preferences/hooks/useUpdatePreferences";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { ThemeOption } from "@/features/preferences/types/preferences.types";
import { PermissionState } from "@/shared/types/permissionState.types";
import { getLocationPermission } from "@/shared/native/location";

const GRANTED: ReadonlySet<PermissionState> = new Set([
  "granted",
  "authorized",
  "authorized_when_in_use",
  "authorized_always",
  "authorized_once",
  "limited",
  "provisional"
]);

function isGranted(state: PermissionState | undefined): boolean {
  return !!state && GRANTED.has(state);
}

function formatLocale(locale: string | undefined | null): string {
  if (!locale) return "System";
  try {
    const display = new Intl.DisplayNames([locale], { type: "language" });
    const language = locale.split("-")[0] || locale;
    return display.of(language) ?? locale;
  } catch {
    return locale;
  }
}

function themeLabel(theme: ThemeOption | undefined): string {
  if (theme === "dark") return "Dark";
  if (theme === "light") return "Light";
  return "System";
}

export function ProfileScreen() {
  const { bootstrap, isSigningOut, signOut } = useAuth();
  const profileQuery = useProfile();
  const permissionsQuery = usePermissions();
  const { subscription } = useSubscription();
  const notifQuery = useNotificationSettings();
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const gate = useEntitlementGate();

  const profile = profileQuery.data ?? (bootstrap?.profile ? toProfile(bootstrap.profile) : null);
  const permissions = permissionsQuery.data ?? bootstrap?.permissions;
  const preferences = preferencesQuery.data;

  // Mirror native location permission state so the toggle matches iOS Settings on
  // app foreground without depending on stale server-cached state.
  const [nativeLocationState, setNativeLocationState] = useState<PermissionState | undefined>(undefined);

  const refreshLocationState = useCallback(async () => {
    try {
      const result = await getLocationPermission();
      setNativeLocationState(result.state);
    } catch {
      // Permission read errors leave us on the server-cached fallback.
    }
  }, []);

  useEffect(() => {
    void refreshLocationState();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refreshLocationState();
    });
    return () => sub.remove();
  }, [refreshLocationState]);

  const locationState = nativeLocationState ?? permissions?.location;
  const locationOn = isGranted(locationState);
  const locationSubtitle = locationState ? permissionLabel(locationState) : "Tap to allow";

  // Entitlements are the canonical plan source (refreshed on foreground / Stripe return);
  // subscription + bootstrap profile are cold-start fallbacks. Baseline is Free, not Basic.
  const planCode = (gate.planCode ?? subscription?.planCode ?? profile?.currentPlanCode ?? "free").toLowerCase();
  const isPro = planCode === "pro";
  const isBasic = planCode === "basic";
  const planBadgeLabel = isPro ? "✦ PRO" : isBasic ? "BASIC" : "FREE";
  const planBadgeTone = isPro ? "purple" : isBasic ? "blue" : "amber";
  const planRowMeta = isPro
    ? "Pro · unlimited cards & AI insights"
    : isBasic
      ? "Basic · upgrade to Pro for unlimited cards"
      : "Free · upgrade to unlock bank linking & more";

  const notifSummary = useMemo(() => {
    const settings = notifQuery.data?.data;
    if (!settings) return "Manage alerts & quiet hours";
    const total = settings.types.length;
    const enabled = settings.types.filter((t) => t.enabled).length;
    const quietPart = settings.quietHoursEnabled ? " · quiet hours on" : "";
    return total > 0 ? `${enabled} of ${total} enabled${quietPart}` : `Master ${settings.masterEnabled ? "on" : "off"}${quietPart}`;
  }, [notifQuery.data]);

  const localeLabel = formatLocale(preferences?.locale);
  const currencyLabel = profile?.currencyCode ?? "USD";
  const languageRegionSubtitle = `${localeLabel} · ${currencyLabel}`;
  const appearanceLabel = themeLabel(preferences?.theme);

  const openSystemSettings = useCallback(() => { void Linking.openSettings(); }, []);

  const pickAppearance = useCallback(() => {
    const choose = (next: ThemeOption) => {
      if (preferences?.theme === next) return;
      updatePreferences.mutate({ theme: next });
    };
    Alert.alert("Appearance", "Choose how TrueSpend should look.", [
      { text: "System", onPress: () => choose("system") },
      { text: "Light", onPress: () => choose("light") },
      { text: "Dark", onPress: () => choose("dark") },
      { text: "Cancel", style: "cancel" }
    ]);
  }, [preferences?.theme, updatePreferences]);

  const confirmSignOut = useCallback(() => {
    Alert.alert("Sign out?", "You will need to sign in again to access TrueSpend.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() }
    ]);
  }, [signOut]);

  if (!profile) {
    return <Screen><ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /></Screen>;
  }

  const appVersion = Constants.expoConfig?.version ?? "—";
  const buildLabel = `v${appVersion} · ${Platform.OS === "ios" ? "iOS" : "Android"}`;

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <ProfileHeader profile={profile} centered />
        <Badge
          tone={planBadgeTone}
          label={planBadgeLabel}
          style={{ marginTop: 6 }}
        />
      </View>

      <SectionLabel>Account</SectionLabel>
      <Card padded={false} style={styles.group}>
        <ListItem
          iconLabel="👤"
          iconTone="muted"
          title="Edit profile"
          subtitle={profile.email}
          trailing={<Chevron />}
          onPress={() => router.push("/(app)/profile/edit" as never)}
        />
        <ListItem
          iconLabel="💎"
          iconTone="purple"
          title="Subscription"
          subtitle={planRowMeta}
          trailing={<Chevron />}
          onPress={() => router.push("/(app)/billing" as never)}
        />
        <ListItem
          iconLabel="🏦"
          iconTone="blue"
          title="Plaid connections"
          subtitle="Manage linked banks"
          trailing={<Chevron />}
          onPress={() => router.push("/(app)/cards/plaid-connections" as never)}
          divider={false}
        />
      </Card>

      <SectionLabel>Preferences</SectionLabel>
      <Card padded={false} style={styles.group}>
        <ListItem
          iconLabel="🔔"
          iconTone="muted"
          title="Notifications"
          subtitle={notifSummary}
          trailing={<Chevron />}
          onPress={() => router.push("/(app)/notifications/settings" as never)}
        />
        <ListItem
          iconLabel="🌐"
          iconTone="muted"
          title="Language & region"
          subtitle={languageRegionSubtitle}
          trailing={<Chevron />}
          onPress={() => router.push("/(app)/profile/edit" as never)}
        />
        <ListItem
          iconLabel="🎨"
          iconTone="muted"
          title="Appearance"
          subtitle={appearanceLabel}
          trailing={<Chevron />}
          onPress={pickAppearance}
          divider={false}
        />
      </Card>

      <SectionLabel>Permissions</SectionLabel>
      <Card padded={false} style={styles.group}>
        <ListItem
          iconLabel="📍"
          iconTone="teal"
          title="Location"
          subtitle={locationSubtitle}
          trailing={<Switch value={locationOn} onChange={openSystemSettings} />}
          onPress={openSystemSettings}
          divider={false}
        />
      </Card>

      <SectionLabel>Privacy & support</SectionLabel>
      <Card padded={false} style={styles.group}>
        <ListItem
          iconLabel="🛡️"
          iconTone="muted"
          title="Privacy & data"
          subtitle="Export · delete"
          trailing={<Chevron />}
          onPress={() => router.push("/(app)/profile/privacy" as never)}
        />
        <ListItem
          iconLabel="📡"
          iconTone="muted"
          title="Sync & offline"
          subtitle="View pending and conflicts"
          trailing={<Chevron />}
          onPress={() => router.push("/(app)/profile/sync" as never)}
        />
        <ListItem
          iconLabel="❓"
          iconTone="muted"
          title="Help & support"
          trailing={<Chevron />}
          onPress={() => void Linking.openURL("https://truespend.app/support")}
          divider={false}
        />
      </Card>

      <View style={styles.footer}>
        {isSigningOut ? <ActivityIndicator color={colors.primary} /> : null}
        <Button disabled={isSigningOut} label="Sign out" onPress={confirmSignOut} variant="danger" />
        <Text style={styles.version}>{buildLabel}</Text>
      </View>
    </Screen>
  );
}

function Chevron() {
  return <Text style={styles.chevron}>›</Text>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 4, paddingBottom: 4 },
  group: { paddingHorizontal: 12 },
  chevron: { color: colors.mutedFg, fontSize: scaleFont(22), fontFamily: fontFamily.regular, marginLeft: 6 },
  footer: { gap: 10, marginTop: 12 },
  version: { color: colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(11), textAlign: "center" }
});
