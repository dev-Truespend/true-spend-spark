import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "@/shared/components/Card";
import { ProLockBadge } from "@/shared/components/ProLockBadge";
import { ListItem } from "@/shared/components/ListItem";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Switch } from "@/shared/components/Switch";
import { TextInput } from "@/shared/components/TextInput";
import { Toast } from "@/shared/components/Toast";
import { colors } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useNotificationSettings } from "@/features/notification-settings/hooks/useNotificationSettings";
import { useUpdateNotificationSettings } from "@/features/notification-settings/hooks/useUpdateNotificationSettings";
import { useUpdateNotificationTypePreference } from "@/features/notification-settings/hooks/useUpdateNotificationTypePreference";
import { NotificationType } from "@/features/notification-settings/api/notification-settings.api";
import { TintName } from "@/shared/theme/colors";
import { getPushPermissionStatus, requestPushPermission } from "@/shared/native/pushNotifications";
import { getLocationPermission, requestLocationPermission } from "@/shared/native/location";

// HH:MM 24-hour format. Empty allowed (cleared).
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function isValidTime(value: string): boolean {
  return value === "" || TIME_RE.test(value.trim());
}

type TypeMeta = { icon: string; tone: TintName; description: string; pro?: boolean };

const TYPE_META: Record<string, TypeMeta> = {
  best_card_alert: { icon: "⭐", tone: "amber", description: "When you enter a store" },
  missed_rewards: { icon: "⚠️", tone: "red", description: "If you used a sub-optimal card", pro: true },
  weekly_summary: { icon: "📅", tone: "green", description: "Every Sunday" },
  unusual_transaction: { icon: "🚨", tone: "red", description: "Outside your normal patterns" },
  budget_warning: { icon: "📊", tone: "amber", description: "Threshold + over-budget", pro: true },
  receipt_processing: { icon: "🧾", tone: "purple", description: "OCR receipt updates", pro: true }
};

function metaFor(code: string): TypeMeta {
  const exact = TYPE_META[code];
  if (exact) return exact;
  const lower = code.toLowerCase();
  for (const [key, value] of Object.entries(TYPE_META)) {
    if (lower.includes(key)) return value;
  }
  return { icon: "🔔", tone: "muted", description: "Notification" };
}

export function NotificationSettingsScreen() {
  const router = useRouter();
  const settingsQuery = useNotificationSettings();
  const settings = settingsQuery.data?.data;
  const updateSettings = useUpdateNotificationSettings();
  const updateType = useUpdateNotificationTypePreference();

  const [masterEnabled, setMasterEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [permissionToast, setPermissionToast] = useState<{ tone: "warn" | "info"; message: string } | null>(null);
  const [quietError, setQuietError] = useState<string | null>(null);

  const snapshotRef = useRef({
    masterEnabled: false,
    pushEnabled: false,
    emailEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: null as string | null,
    quietHoursEnd: null as string | null
  });

  useEffect(() => {
    if (!settings) return;
    setMasterEnabled(settings.masterEnabled);
    setPushEnabled(settings.pushEnabled);
    setEmailEnabled(settings.emailEnabled);
    setQuietHoursEnabled(settings.quietHoursEnabled);
    setQuietStart(settings.quietHoursStart ?? "");
    setQuietEnd(settings.quietHoursEnd ?? "");
    snapshotRef.current = {
      masterEnabled: settings.masterEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHoursEnabled: settings.quietHoursEnabled,
      quietHoursStart: settings.quietHoursStart ?? null,
      quietHoursEnd: settings.quietHoursEnd ?? null
    };
  }, [settings]);

  async function persist(partial: Partial<typeof snapshotRef.current>) {
    const next = { ...snapshotRef.current, ...partial };
    snapshotRef.current = next;
    await updateSettings.mutateAsync(next);
  }

  async function handlePushToggle(next: boolean) {
    if (!next) {
      setPushEnabled(false);
      await persist({ pushEnabled: false });
      return;
    }
    // Re-request OS permission before persisting ON. If denied, route the user
    // to system Settings and leave the toggle off so it accurately reflects state.
    const current = await getPushPermissionStatus();
    let status = current;
    if (current !== "granted") {
      status = await requestPushPermission();
    }
    if (status !== "granted") {
      setPushEnabled(false);
      setPermissionToast({
        tone: "warn",
        message: "Push notifications are blocked. Open Settings to allow them, then try again."
      });
      Alert.alert(
        "Allow notifications",
        "Push notifications are blocked for TrueSpend. Open system Settings to enable them.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => { void Linking.openSettings(); } }
        ]
      );
      return;
    }
    setPushEnabled(true);
    setPermissionToast(null);
    await persist({ pushEnabled: true });
  }

  async function maybePromptAlwaysLocation() {
    // Workflow 10 / 13: when user first enables best_card_alert, ask for
    // background ("Always") location so geo-arrival pushes can fire.
    const current = await getLocationPermission();
    if (current.state === "authorized_always") return;
    if (current.state !== "authorized_when_in_use") {
      // Foreground not yet granted — geo notifications can't work either way.
      setPermissionToast({
        tone: "warn",
        message: "Geo alerts need location access. Enable it in your profile permissions."
      });
      return;
    }
    Alert.alert(
      "Allow Always for store alerts",
      "TrueSpend uses your location in the background to suggest the best card the moment you arrive at a store. You can change this anytime.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Allow Always",
          onPress: async () => {
            const result = await requestLocationPermission("background");
            if (result.state !== "authorized_always") {
              if (!result.canAskAgain) {
                Alert.alert(
                  "Permission needed",
                  "Open system Settings to allow Always location.",
                  [
                    { text: "Not now", style: "cancel" },
                    { text: "Open Settings", onPress: () => { void Linking.openSettings(); } }
                  ]
                );
              } else {
                setPermissionToast({
                  tone: "info",
                  message: "Store alerts work best with Always location."
                });
              }
            }
          }
        }
      ]
    );
  }

  function handleType(typeCode: string, enabled: boolean) {
    void updateType.mutateAsync({ typeCode, enabled });
    if (enabled && typeCode === "best_card_alert") {
      void maybePromptAlwaysLocation();
    }
  }

  function commitQuietRange() {
    const startValid = isValidTime(quietStart);
    const endValid = isValidTime(quietEnd);
    if (!startValid || !endValid) {
      setQuietError("Use 24-hour HH:MM (e.g. 22:00).");
      return;
    }
    setQuietError(null);
    void persist({
      quietHoursStart: quietStart.trim() || null,
      quietHoursEnd: quietEnd.trim() || null
    });
  }

  if (settingsQuery.isLoading) {
    return <Screen><ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /></Screen>;
  }
  if (!settings) {
    return <Screen><Toast tone="error" message="Could not load notification settings." /></Screen>;
  }

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Notifications</Text>
        <View style={styles.iconBtn} />
      </View>

      <SectionLabel>Channels</SectionLabel>
      <Card padded={false} style={styles.group}>
        <ListItem
          iconLabel="🔔"
          iconTone="green"
          title="Allow notifications"
          subtitle="Master setting for all alert types"
          trailing={
            <Switch
              value={masterEnabled}
              onChange={(v) => { setMasterEnabled(v); void persist({ masterEnabled: v }); }}
            />
          }
        />
        <ListItem
          iconLabel="📱"
          iconTone="blue"
          title="Push notifications"
          subtitle="Real-time alerts on this device"
          trailing={
            <Switch
              value={pushEnabled}
              onChange={(v) => { void handlePushToggle(v); }}
              disabled={!masterEnabled}
            />
          }
        />
        <ListItem
          iconLabel="✉️"
          iconTone="purple"
          title="Email"
          subtitle="Daily digest + missed rewards"
          trailing={
            <Switch
              value={emailEnabled}
              onChange={(v) => { setEmailEnabled(v); void persist({ emailEnabled: v }); }}
              disabled={!masterEnabled}
            />
          }
          divider={false}
        />
      </Card>

      <SectionLabel>Alert types</SectionLabel>
      <Card padded={false} style={styles.group}>
        {settings.types.length === 0 ? (
          <Text style={styles.muted}>No configurable notification types.</Text>
        ) : (
          settings.types.map((type, idx) => (
            <TypeRow
              key={type.code}
              type={type}
              disabled={!masterEnabled}
              onToggle={handleType}
              isLast={idx === settings.types.length - 1}
            />
          ))
        )}
      </Card>

      <SectionLabel>Quiet hours</SectionLabel>
      <Card>
        <View style={styles.quietHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.quietTitle}>Pause notifications</Text>
            <Text style={styles.quietMeta}>
              {quietHoursEnabled && (quietStart || quietEnd)
                ? `${quietStart || "—"} – ${quietEnd || "—"}`
                : "Set a window to pause alerts"}
            </Text>
          </View>
          <Switch
            value={quietHoursEnabled}
            onChange={(v) => { setQuietHoursEnabled(v); void persist({ quietHoursEnabled: v }); }}
            disabled={!masterEnabled}
          />
        </View>
        {quietHoursEnabled ? (
          <View style={styles.quietRange}>
            <View style={styles.quietCol}>
              <TextInput
                label="From"
                placeholder="22:00"
                value={quietStart}
                onChangeText={(v) => { setQuietStart(v); if (quietError) setQuietError(null); }}
                onBlur={commitQuietRange}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                error={quietError && !isValidTime(quietStart) ? "HH:MM" : undefined}
              />
            </View>
            <View style={styles.quietCol}>
              <TextInput
                label="To"
                placeholder="08:00"
                value={quietEnd}
                onChangeText={(v) => { setQuietEnd(v); if (quietError) setQuietError(null); }}
                onBlur={commitQuietRange}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                error={quietError && !isValidTime(quietEnd) ? "HH:MM" : undefined}
              />
            </View>
          </View>
        ) : null}
        {quietError ? <Text style={styles.quietErrorText}>{quietError}</Text> : null}
      </Card>

      {permissionToast ? <Toast tone={permissionToast.tone} message={permissionToast.message} /> : null}
      {updateSettings.error ? <Toast tone="error" message={(updateSettings.error as Error).message} /> : null}
      {updateType.error ? <Toast tone="error" message={(updateType.error as Error).message} /> : null}
    </Screen>
  );
}

type TypeRowProps = {
  type: NotificationType;
  disabled?: boolean;
  isLast?: boolean;
  onToggle: (typeCode: string, enabled: boolean) => void;
};

function TypeRow({ type, disabled, isLast, onToggle }: TypeRowProps) {
  const meta = metaFor(type.code);
  const title = meta.pro ? `${type.displayName}` : type.displayName;
  return (
    <ListItem
      iconLabel={meta.icon}
      iconTone={meta.tone}
      title={title}
      subtitle={meta.description}
      divider={!isLast}
      trailing={
        <View style={styles.typeTrailing}>
          {meta.pro ? <ProLockBadge style={styles.proBadge} /> : null}
          <Switch
            value={type.enabled}
            onChange={(v) => onToggle(type.code, v)}
            disabled={disabled}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: colors.text },
  group: { paddingHorizontal: 12 },
  muted: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: colors.mutedFg, paddingVertical: 12, textAlign: "center" },
  quietHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  quietTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14), color: colors.text },
  quietMeta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.mutedFg, marginTop: 2 },
  quietRange: { flexDirection: "row", gap: 10, marginTop: 10 },
  quietCol: { flex: 1 },
  quietErrorText: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.destructive, marginTop: 6 },
  typeTrailing: { flexDirection: "row", alignItems: "center", gap: 8 },
  proBadge: { paddingHorizontal: 6, paddingVertical: 1 }
});
