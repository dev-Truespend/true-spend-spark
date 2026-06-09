import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
  useSafeAreaInsets
} from "react-native-safe-area-context";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { TrialBanner } from "@/features/billing/components/TrialBanner";
import { GlobalSyncBanner } from "@/features/sync/components/GlobalSyncBanner";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { useSyncStatus } from "@/features/sync/hooks/useSyncStatus";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

export default function AppLayout() {
  const { session, isRestoring } = useAuth();
  const theme = useTheme();
  const rootStyles = useThemedStyles((t) =>
    StyleSheet.create({ root: { flex: 1, backgroundColor: t.colors.background } })
  );

  if (isRestoring) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={rootStyles.root}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <AuthenticatedChrome>
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      </AuthenticatedChrome>
    </View>
  );
}

const TAB_ROOT_PATHS = new Set(["/", "/insights", "/profile"]);

function AuthenticatedChrome({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { entitlements } = useEntitlements();
  const { status } = useSyncStatus();
  const styles = useThemedStyles(buildStyles);

  const inOnboarding = pathname?.includes("onboarding") ?? false;
  const inProfile = pathname?.includes("profile") ?? false;
  // Account-reactivation is a locked screen: no chrome, no escape route until the user reactivates or signs out.
  const inReactivation = pathname?.includes("account-reactivation") ?? false;
  const isTabRoot = pathname ? TAB_ROOT_PATHS.has(pathname) : true;
  const showBack = !isTabRoot && !inOnboarding && !inReactivation;
  const showTrial = !!entitlements?.trialing && !inOnboarding && !inReactivation;
  const showSync = !!status && (!status.online || status.pendingCount > 0) && !inOnboarding && !inReactivation;
  const showBell = !inProfile && !inOnboarding && !inReactivation;
  const hasChrome = showBack || showTrial || showSync || showBell;

  return (
    <>
      {hasChrome ? (
        <SafeAreaView edges={["top"]} style={styles.chrome}>
          {showBack ? <BackButton /> : null}
          <View style={styles.bannerColumn}>
            {showTrial ? <TrialBanner /> : null}
            {showSync ? <GlobalSyncBanner /> : null}
          </View>
          {showBell ? <NotificationBell /> : null}
        </SafeAreaView>
      ) : null}
      <SafeAreaInsetsContext.Provider value={hasChrome ? { ...insets, top: 0 } : insets}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </>
  );
}

function BackButton() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(app)/(tabs)");
      }}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={10}
      style={({ pressed }) => [styles.back, pressed && styles.bellPressed]}
    >
      <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
    </Pressable>
  );
}

function NotificationBell() {
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
      style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
    >
      <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
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
    chrome: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: t.spacing.md,
      paddingTop: 0,
      paddingBottom: 0,
      gap: t.spacing.sm,
      backgroundColor: t.colors.background
    },
    bannerColumn: { flex: 1, gap: t.spacing.sm },
    bell: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      position: "relative"
    },
    back: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border
    },
    bellPressed: { opacity: 0.7 },
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
