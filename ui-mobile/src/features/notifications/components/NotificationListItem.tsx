import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Notification } from "@/features/notifications/types/notifications.types";
import { colors, gradients, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  notification: Notification;
  onPress: (id: number) => void;
};

function styleForType(typeCode: string): { gradient: keyof typeof gradients | null; flat?: string; icon: string } {
  const lower = typeCode.toLowerCase();
  if (lower.includes("security") || lower.includes("unusual")) return { gradient: null, flat: colors.destructive, icon: "🚨" };
  if (lower.includes("missed")) return { gradient: "cool", icon: "💡" };
  if (lower.includes("reward") || lower.includes("earn")) return { gradient: "warm", icon: "⭐" };
  if (lower.includes("location") || lower.includes("nearby") || lower.includes("geo")) return { gradient: "brand", icon: "📍" };
  if (lower.includes("summary")) return { gradient: null, flat: colors.surfaceAlt, icon: "📅" };
  return { gradient: "brand", icon: "🔔" };
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  if (diff < 604800) return `${Math.round(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationListItem({ notification, onPress }: Props) {
  const s = styleForType(notification.typeCode);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [styles.card, notification.isRead && styles.read, pressed && styles.pressed]}
    >
      {s.gradient ? (
        <LinearGradient
          colors={[...gradients[s.gradient]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.icon}
        >
          <Text style={styles.iconGlyph}>{s.icon}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.icon, { backgroundColor: s.flat ?? colors.surfaceAlt }]}>
          <Text style={[styles.iconGlyph, s.flat === colors.surfaceAlt && { color: colors.text }]}>{s.icon}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.time}>{relativeTime(notification.createdAt)}</Text>
        </View>
        <Text style={styles.text} numberOfLines={2}>{notification.body}</Text>
      </View>
      {!notification.isRead ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    backgroundColor: palette.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    marginBottom: 8,
    shadowColor: "#0B1220",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  pressed: { opacity: 0.92 },
  read: { opacity: 0.78 },
  icon: { width: 34, height: 34, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  iconGlyph: { fontSize: scaleFont(16), color: palette.white },
  body: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: colors.text, flex: 1 },
  time: { fontFamily: fontFamily.regular, fontSize: scaleFont(10), color: colors.mutedFg },
  text: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: colors.mutedFg, marginTop: 2, lineHeight: 17 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 }
});
