import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { SyncBanner } from "@/shared/components/SyncBanner";
import { Toast } from "@/shared/components/Toast";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useSyncStatus } from "@/features/sync/hooks/useSyncStatus";
import { useRetrySync } from "@/features/sync/hooks/useRetrySync";
import { SyncEventSeverity } from "@/features/sync/types/sync.types";

function relativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function toneFor(severity: SyncEventSeverity): "info" | "success" | "warn" | "error" {
  if (severity === "success") return "success";
  if (severity === "warn") return "warn";
  if (severity === "error") return "error";
  return "info";
}

export function SyncStatusScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { status, isLoading, error, refetch, isFetching } = useSyncStatus();
  const retry = useRetrySync();

  const online = status?.online ?? true;
  const pending = status?.pendingCount ?? 0;
  const events = status?.recentEvents ?? [];
  const cachedCounts = status?.cachedCounts ?? [];

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Sync status</Text>
        <Pressable onPress={() => void refetch()} style={styles.iconBtn} accessibilityRole="button" hitSlop={6}>
          <Ionicons name="refresh" size={18} color={colors.text} />
        </Pressable>
      </View>

      <SyncBanner
        tone={!online ? "offline" : pending > 0 ? "warn" : "info"}
        message={
          !online
            ? "You're offline — viewing cached data"
            : pending > 0
              ? `${pending} pending uploads`
              : "All caught up"
        }
      />

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Toast tone="error" message={error} /> : null}

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Last sync</Text>
          <Text style={styles.statValue}>{relativeTime(status?.lastSyncAt)}</Text>
          <Text style={pending > 0 ? styles.statDeltaDown : styles.statDelta}>
            {pending > 0 ? `${pending} pending` : "Up to date"}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Cached items</Text>
          <Text style={styles.statValue}>
            {cachedCounts.reduce((sum, c) => sum + c.count, 0)} items
          </Text>
          <Text style={styles.statDelta}>{cachedCounts.length} types</Text>
        </View>
      </View>

      {cachedCounts.length > 0 ? (
        <View style={{ gap: 6 }}>
          <SectionLabel>Cache breakdown</SectionLabel>
          {cachedCounts.map((c) => (
            <View key={c.entityType} style={styles.row}>
              <Text style={styles.rowLabel}>{c.entityType}</Text>
              <Badge tone="muted" label={`${c.count}`} />
            </View>
          ))}
        </View>
      ) : null}

      {events.length > 0 ? (
        <View style={{ gap: 6 }}>
          <SectionLabel>Recent sync events</SectionLabel>
          {events.map((e, i) => (
            <Toast key={`${e.type}-${e.occurredAt}-${i}`} tone={toneFor(e.severity)} message={e.message} />
          ))}
        </View>
      ) : null}

      <Button
        label={retry.isPending || isFetching ? "Retrying…" : "Retry sync now"}
        onPress={() => retry.mutate()}
        loading={retry.isPending}
        disabled={retry.isPending || !online}
      />
      {retry.error ? <Toast tone="error" message={(retry.error as Error).message} /> : null}
    </Screen>
  );
}

const useStyles = () =>
  useThemedStyles((t) =>
    StyleSheet.create({
      topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
      iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
      topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
      statGrid: { flexDirection: "row", gap: 8 },
      statCard: {
        flex: 1,
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderWidth: 1,
        borderRadius: radii.xl,
        padding: 12,
        gap: 4
      },
      statLabel: {
        fontFamily: fontFamily.bold,
        fontSize: scaleFont(10),
        color: t.colors.mutedFg,
        letterSpacing: 0.6,
        textTransform: "uppercase"
      },
      statValue: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(15), color: t.colors.text, letterSpacing: -0.2 },
      statDelta: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(11), color: t.colors.successText },
      statDeltaDown: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(11), color: t.colors.destructive },
      row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderWidth: 1,
        borderRadius: radii.md
      },
      rowLabel: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: t.colors.text }
    })
  );
