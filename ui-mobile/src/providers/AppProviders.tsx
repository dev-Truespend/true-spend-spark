import { PropsWithChildren, useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider, useThemeApi } from "@/providers/ThemeProvider";
import { AppErrorBoundary } from "@/shared/components/AppErrorBoundary";
import { usePreferences } from "@/features/preferences/hooks/usePreferences";
import { usePushNotificationRouting } from "@/shared/native/usePushNotificationRouting";
import { useArrivalDetection } from "@/shared/native/useArrivalDetection";
import { useEntitlementRequiredRouter } from "@/shared/native/useEntitlementRequiredRouter";
import { useAppForegroundRefresh } from "@/shared/native/useAppForegroundRefresh";
import { useLookupsWarmup } from "@/features/lookups/hooks/useLookupsWarmup";

function PushNotificationListener() {
  usePushNotificationRouting();
  return null;
}

function ArrivalDetectionListener() {
  useArrivalDetection();
  return null;
}

function EntitlementRequiredRouter() {
  useEntitlementRequiredRouter();
  return null;
}

function AppForegroundRefresh() {
  useAppForegroundRefresh();
  return null;
}

function LookupsWarmup() {
  useLookupsWarmup();
  return null;
}

function ThemePreferenceBinder() {
  const { data: preferences } = usePreferences();
  const { mode, setMode } = useThemeApi();
  useEffect(() => {
    const next = preferences?.theme ?? "system";
    if (next !== mode) setMode(next);
  }, [preferences?.theme, mode, setMode]);
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemePreferenceBinder />
            <PushNotificationListener />
            <ArrivalDetectionListener />
            <EntitlementRequiredRouter />
            <AppForegroundRefresh />
            <LookupsWarmup />
            <AppErrorBoundary>{children}</AppErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
