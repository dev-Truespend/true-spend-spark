import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

type Props = {
  // `onGlobe` floats the bell over the Wallet's satellite globe (dark in both
  // light & dark app themes), so it uses a glass scrim + white icon for contrast
  // instead of theme surface colors.
  onGlobe?: boolean;
};

// Round bell button with an unread badge. Shared by the authenticated chrome
// (Insights/Profile) and the Wallet's floating header (over the globe).
export function NotificationBell({ onGlobe = false }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { notifications } = useNotifications("unread");
  const unreadCount = notifications.length;
  const label =
    unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "Notifications";

  return (
    <Pressable
      onPress={() => router.push("/(app)/notifications")}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [styles.bell, onGlobe && styles.bellGlobe, pressed && styles.pressed]}
    >
      <Ionicons
        name="notifications-outline"
        size={20}
        color={onGlobe ? theme.palette.white : theme.colors.text}
      />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    bell: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      position: "relative"
    },
    bellGlobe: {
      backgroundColor: "rgba(18, 22, 30, 0.55)",
      borderColor: "rgba(255, 255, 255, 0.22)"
    },
    pressed: { opacity: 0.7 },
    badge: {
      position: "absolute",
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: t.colors.destructive,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: t.colors.background
    },
    badgeText: {
      color: t.palette.white,
      fontFamily: t.fontFamily.heavy,
      fontWeight: "800",
      fontSize: 10,
      letterSpacing: 0.2
    }
  });
}
