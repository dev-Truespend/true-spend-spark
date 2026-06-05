import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useMarkAllNotificationsRead } from "@/features/notifications/hooks/useMarkAllNotificationsRead";
import { NotificationListItem } from "@/features/notifications/components/NotificationListItem";
import { NotificationFilterTabs } from "@/features/notifications/components/NotificationFilterTabs";
import { Notification } from "@/features/notifications/types/notifications.types";

type Filter = "all" | "unread" | "rewards" | "security";

export function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const { notifications, isLoading, error } = useNotifications(filter);
  const markAllRead = useMarkAllNotificationsRead();

  const handlePress = useCallback((id: number) => {
    router.push(`/(app)/notifications/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Notification }) => (
    <NotificationListItem notification={item} onPress={handlePress} />
  ), [handlePress]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push("/(app)/notifications/settings")}>
            <Text style={styles.markAllText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      </View>
      <NotificationFilterTabs activeFilter={filter} onFilterChange={setFilter} />
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No notifications.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  markAllText: {
    color: colors.primary,
    fontSize: 14
  },
  loader: {
    marginTop: spacing.xl
  },
  error: {
    color: colors.danger,
    textAlign: "center"
  },
  emptyState: {
    alignItems: "center",
    marginTop: spacing.xl
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15
  },
  list: {
    paddingBottom: spacing.lg
  }
});
