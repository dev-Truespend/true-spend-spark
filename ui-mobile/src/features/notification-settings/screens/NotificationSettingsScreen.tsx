import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { TextInput } from "@/shared/components/TextInput";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useNotificationSettings } from "@/features/notification-settings/hooks/useNotificationSettings";
import { useUpdateNotificationSettings } from "@/features/notification-settings/hooks/useUpdateNotificationSettings";
import { useUpdateNotificationTypePreference } from "@/features/notification-settings/hooks/useUpdateNotificationTypePreference";

export function NotificationSettingsScreen() {
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

  // Latest local snapshot. persist() reads from this ref so rapid toggles don't
  // send a stale value for an unrelated field captured by closure.
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

  async function handleType(typeCode: string, enabled: boolean) {
    await updateType.mutateAsync({ typeCode, enabled });
  }

  if (settingsQuery.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </Screen>
    );
  }

  if (!settings) {
    return (
      <Screen>
        <Text style={styles.error}>Could not load notification settings.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Notifications</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <Row
            label="All notifications"
            value={masterEnabled}
            onChange={(v) => {
              setMasterEnabled(v);
              void persist({ masterEnabled: v });
            }}
          />
          <Row
            label="Push notifications"
            value={pushEnabled}
            onChange={(v) => {
              setPushEnabled(v);
              void persist({ pushEnabled: v });
            }}
            disabled={!masterEnabled}
          />
          <Row
            label="Email notifications"
            value={emailEnabled}
            onChange={(v) => {
              setEmailEnabled(v);
              void persist({ emailEnabled: v });
            }}
            disabled={!masterEnabled}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet hours</Text>
          <Row
            label="Pause during quiet hours"
            value={quietHoursEnabled}
            onChange={(v) => {
              setQuietHoursEnabled(v);
              void persist({ quietHoursEnabled: v });
            }}
            disabled={!masterEnabled}
          />
          {quietHoursEnabled ? (
            <>
              <Text style={styles.label}>Start (HH:MM)</Text>
              <TextInput onChangeText={setQuietStart} placeholder="22:00" value={quietStart} />
              <Text style={styles.label}>End (HH:MM)</Text>
              <TextInput onChangeText={setQuietEnd} placeholder="07:00" value={quietEnd} />
              <Button
                disabled={updateSettings.isPending}
                label={updateSettings.isPending ? "Saving…" : "Save quiet hours"}
                onPress={() => void persist({
                  quietHoursStart: quietStart.trim() || null,
                  quietHoursEnd: quietEnd.trim() || null
                })}
              />
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification types</Text>
          {settings.types.length === 0 ? (
            <Text style={styles.muted}>No configurable notification types.</Text>
          ) : settings.types.map((t) => (
            <Row
              key={t.code}
              label={t.displayName}
              value={t.enabled}
              onChange={(v) => void handleType(t.code, v)}
              disabled={!masterEnabled}
            />
          ))}
        </View>

        {updateSettings.error ? (
          <Text style={styles.error}>{(updateSettings.error as Error).message}</Text>
        ) : null}
        {updateType.error ? (
          <Text style={styles.error}>{(updateType.error as Error).message}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch onValueChange={onChange} value={value} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xl },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs
  },
  rowDisabled: { opacity: 0.5 },
  rowLabel: { color: colors.text, flex: 1, fontSize: 14 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 }
});
