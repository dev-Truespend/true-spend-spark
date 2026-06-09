import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/shared/components/EmptyState";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Toast } from "@/shared/components/Toast";
import { colors } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useMarkAllNotificationsRead } from "@/features/notifications/hooks/useMarkAllNotificationsRead";
import { NotificationListItem } from "@/features/notifications/components/NotificationListItem";
import { NotificationFilterTabs } from "@/features/notifications/components/NotificationFilterTabs";
import { Notification } from "@/features/notifications/types/notifications.types";

type Filter = "all" | "unread" | "rewards" | "security";

function bucketLabel(iso: string): string {
  const d = new Date(iso).getTime();
  const ageMin = (Date.now() - d) / 60000;
  if (ageMin < 60) return "Just now";
  if (ageMin < 60 * 24) return "Earlier today";
  if (ageMin < 60 * 48) return "Yesterday";
  if (ageMin < 60 * 24 * 7) return "This week";
  return "Earlier";
}

function groupByBucket(items: Notification[]): [string, Notification[]][] {
  const order = ["Just now", "Earlier today", "Yesterday", "This week", "Earlier"];
  const buckets = new Map<string, Notification[]>();
  for (const n of items) {
    const key = bucketLabel(n.createdAt);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(n);
  }
  return order.filter((k) => buckets.has(k)).map((k) => [k, buckets.get(k)!]);
}

export function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const { notifications, isLoading, error } = useNotifications(filter);
  const markAllRead = useMarkAllNotificationsRead();

  const handlePress = useCallback((id: number) => {
    router.push(`/(app)/notifications/${id}`);
  }, [router]);

  const grouped = useMemo(() => groupByBucket(notifications), [notifications]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(app)/notifications/settings")}
            style={styles.iconBtn}
          >
            <Ionicons name="settings-outline" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            hitSlop={6}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        </View>
      </View>

      <NotificationFilterTabs activeFilter={filter} onFilterChange={setFilter} />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : error ? (
        <Toast tone="error" message={error} />
      ) : notifications.length === 0 ? (
        <EmptyState
          iconLabel="🔔"
          title="You're all caught up"
          description="When something needs attention, it'll appear here."
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {grouped.map(([bucket, items]) => (
            <View key={bucket} style={{ gap: 6, marginBottom: 4 }}>
              <SectionLabel>{bucket}</SectionLabel>
              {items.map((n) => (
                <NotificationListItem key={n.id} notification={n} onPress={handlePress} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontFamily: fontFamily.heavy, fontSize: scaleFont(24), fontWeight: "800", letterSpacing: -0.4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  markAllText: { color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12) }
});
