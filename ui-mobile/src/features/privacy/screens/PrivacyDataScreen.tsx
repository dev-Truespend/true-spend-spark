import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Switch } from "@/shared/components/Switch";
import { Toast } from "@/shared/components/Toast";
import { useTheme, useThemedStyles, type Theme } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { usePrivacySettings } from "@/features/privacy/hooks/usePrivacySettings";
import { useUpdatePrivacySettings } from "@/features/privacy/hooks/useUpdatePrivacySettings";
import { useAccountDeletionStatus } from "@/features/privacy/hooks/useAccountDeletionStatus";
import {
  useCancelAccountDeletion,
  useRequestAccountDeletion
} from "@/features/privacy/hooks/useRequestAccountDeletion";
import {
  useDownloadLocationHistory,
  useRequestDataExport
} from "@/features/privacy/hooks/useRequestDataExport";
import { useClearLocationHistory } from "@/features/privacy/hooks/useClearLocationHistory";

export function PrivacyDataScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const router = useRouter();
  const { settings, isLoading, error } = usePrivacySettings();
  const updateSettings = useUpdatePrivacySettings();
  const { status: deletionStatus } = useAccountDeletionStatus();
  const requestDeletion = useRequestAccountDeletion();
  const cancelDeletion = useCancelAccountDeletion();
  const requestExport = useRequestDataExport();
  const downloadLocation = useDownloadLocationHistory();
  const clearLocation = useClearLocationHistory();

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function toggleSetting(key: keyof NonNullable<typeof settings>, value: boolean) {
    updateSettings.mutate({ [key]: value });
  }

  function handleExport() {
    Alert.alert("Export your data", "Choose a format. We'll email a link within 24h.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "CSV",
        onPress: () => {
          requestExport.mutate({ format: "csv" }, {
            onSuccess: () => setActionMessage("Export queued. We'll email you when it's ready.")
          });
        }
      },
      {
        text: "JSON",
        onPress: () => {
          requestExport.mutate({ format: "json" }, {
            onSuccess: () => setActionMessage("Export queued. We'll email you when it's ready.")
          });
        }
      }
    ]);
  }

  function handleClearLocation() {
    Alert.alert("Clear location history?", "Visited places will be removed. In-store suggestions keep working.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearLocation.mutate({}, {
            onSuccess: () => setActionMessage("Location history clear queued.")
          });
        }
      }
    ]);
  }

  function handleRequestDeletion() {
    Alert.alert(
      "Delete my account",
      "We'll keep your account for 14 days in case you change your mind. After that, everything is permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => requestDeletion.mutate()
        }
      ]
    );
  }

  function handleCancelDeletion() {
    cancelDeletion.mutate();
  }

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Privacy & data</Text>
        <View style={styles.iconBtn} />
      </View>

      <Toast tone="success" message="We never sell or share your data. Read-only Plaid · on-device location." />

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Toast tone="error" message={error} /> : null}

      {deletionStatus?.status === "pending" ? (
        <View style={styles.deletionPending}>
          <Toast
            tone="warn"
            message={`Deletion pending: requested ${deletionStatus.requestedAt?.slice(0, 10) ?? "—"}. Cancel?`}
          />
          <Button
            label={cancelDeletion.isPending ? "Cancelling…" : "Cancel deletion"}
            onPress={handleCancelDeletion}
            disabled={cancelDeletion.isPending}
            loading={cancelDeletion.isPending}
            variant="outline"
          />
        </View>
      ) : null}

      <SectionLabel>Your data</SectionLabel>
      <ActionCard
        iconName="download-outline"
        title="Export your data"
        subtitle="CSV or JSON · emailed within 24h"
        onPress={handleExport}
        loading={requestExport.isPending}
      />
      <ActionCard
        iconName="map-outline"
        title="Download location history"
        subtitle="Visited places · last 90 days"
        onPress={() => downloadLocation.mutate()}
        loading={downloadLocation.isPending}
      />
      <ActionCard
        iconName="trash-outline"
        title="Clear location history"
        subtitle="In-store suggestions keep working"
        onPress={handleClearLocation}
        loading={clearLocation.isPending}
      />

      <SectionLabel>Permissions</SectionLabel>
      <ToggleRow
        title="Analytics (anonymous)"
        subtitle="Helps us improve recommendations"
        value={!!settings?.anonymousAnalyticsEnabled}
        onChange={(v) => toggleSetting("anonymousAnalyticsEnabled", v)}
        disabled={!settings || updateSettings.isPending}
      />
      <ToggleRow
        title="Personalized AI insights"
        subtitle="Uses your spending patterns"
        value={!!settings?.personalizedAIInsightsEnabled}
        onChange={(v) => toggleSetting("personalizedAIInsightsEnabled", v)}
        disabled={!settings || updateSettings.isPending}
      />
      <ToggleRow
        title="Location history"
        subtitle="Required to download or use past visits"
        value={!!settings?.locationHistoryEnabled}
        onChange={(v) => toggleSetting("locationHistoryEnabled", v)}
        disabled={!settings || updateSettings.isPending}
      />
      <ToggleRow
        title="Help improve TrueSpend"
        subtitle="Aggregated, non-identifying telemetry"
        value={!!settings?.dataSharingForImprovementEnabled}
        onChange={(v) => toggleSetting("dataSharingForImprovementEnabled", v)}
        disabled={!settings || updateSettings.isPending}
      />

      <Text style={styles.dangerLabel}>Danger zone</Text>
      {deletionStatus?.status !== "pending" ? (
        <Button
          label={requestDeletion.isPending ? "Requesting…" : "Delete my account"}
          variant="danger"
          onPress={handleRequestDeletion}
          disabled={requestDeletion.isPending}
        />
      ) : null}
      <Text style={styles.dangerHint}>
        We'll keep your account for 14 days in case you change your mind. After that, everything is permanently removed.
      </Text>

      {actionMessage ? <Toast tone="success" message={actionMessage} /> : null}
      {updateSettings.error ? <Toast tone="error" message={(updateSettings.error as Error).message} /> : null}
      {requestExport.error ? <Toast tone="error" message={(requestExport.error as Error).message} /> : null}
      {clearLocation.error ? <Toast tone="error" message={(clearLocation.error as Error).message} /> : null}
      {downloadLocation.error ? <Toast tone="error" message={(downloadLocation.error as Error).message} /> : null}
      {requestDeletion.error ? <Toast tone="error" message={(requestDeletion.error as Error).message} /> : null}
      {cancelDeletion.error ? <Toast tone="error" message={(cancelDeletion.error as Error).message} /> : null}
    </Screen>
  );
}

type ActionCardProps = {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
};

function ActionCard({ iconName, title, subtitle, onPress, loading }: ActionCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={loading} style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}>
      <View style={styles.actionIcon}>
        <Ionicons name={iconName} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} />
      )}
    </Pressable>
  );
}

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({ title, subtitle, value, onChange, disabled }: ToggleRowProps) {
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

const buildStyles = (t: Theme) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
    topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
    deletionPending: { gap: 8 },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      backgroundColor: t.colors.surface,
      borderColor: t.colors.border,
      borderWidth: 1,
      borderRadius: radii.xl
    },
    actionPressed: { opacity: 0.9 },
    actionIcon: {
      width: 36, height: 36, borderRadius: radii.md,
      backgroundColor: t.tints.blue.bg,
      alignItems: "center", justifyContent: "center"
    },
    actionTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14), color: t.colors.text },
    actionSubtitle: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, marginTop: 2 },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8
    },
    toggleTitle: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: t.colors.text },
    toggleSubtitle: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, marginTop: 2 },
    dangerLabel: {
      fontFamily: fontFamily.bold,
      fontWeight: "700",
      fontSize: scaleFont(11),
      color: t.colors.destructive,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 8
    },
    dangerHint: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, lineHeight: 16 }
  });
