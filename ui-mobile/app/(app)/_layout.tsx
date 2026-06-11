import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/providers/AuthProvider";
import { ChromeInsetContext } from "@/shared/navigation/chromeInset";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { TrialBanner } from "@/features/billing/components/TrialBanner";
import { GlobalSyncBanner } from "@/features/sync/components/GlobalSyncBanner";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { useSyncStatus } from "@/features/sync/hooks/useSyncStatus";

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
  const pathname = usePathname();
  const { entitlements } = useEntitlements();
  const { status } = useSyncStatus();
  const styles = useThemedStyles(buildStyles);

  const inOnboarding = pathname?.includes("onboarding") ?? false;
  const inProfile = pathname?.includes("profile") ?? false;
  // The Wallet root is full-bleed (globe background + bottom sheet) and renders
  // its own floating banner + bell, so the shared chrome is suppressed there.
  const inWallet = pathname === "/";
  // Account-reactivation is a locked screen: no chrome, no escape route until the user reactivates or signs out.
  const inReactivation = pathname?.includes("account-reactivation") ?? false;
  const isTabRoot = pathname ? TAB_ROOT_PATHS.has(pathname) : true;
  const showBack = !isTabRoot && !inOnboarding && !inReactivation;
  const showTrial = !!entitlements?.trialing && !inOnboarding && !inReactivation && !inWallet;
  const showSync = !!status && (!status.online || status.pendingCount > 0) && !inOnboarding && !inReactivation && !inWallet;
  const showBell = !inProfile && !inOnboarding && !inReactivation && !inWallet;
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
      <ChromeInsetContext.Provider value={hasChrome}>{children}</ChromeInsetContext.Provider>
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
      <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
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
    back: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border
    },
    bellPressed: { opacity: 0.7 }
  });
}
