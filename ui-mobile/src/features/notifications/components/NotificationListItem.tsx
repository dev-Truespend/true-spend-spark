import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { Notification } from "@/features/notifications/types/notifications.types";

type Props = {
  notification: Notification;
  onPress: (id: number) => void;
};

export function NotificationListItem({ notification, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, notification.isRead && styles.read]}
      onPress={() => onPress(notification.id)}
    >
      {!notification.isRead && <View style={styles.unreadDot} />}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        <Text style={styles.meta}>{new Date(notification.createdAt).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  read: {
    opacity: 0.7
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8
  },
  content: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  body: {
    color: colors.muted,
    fontSize: 13
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  }
});
