import { PropsWithChildren, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider, useThemeApi } from "@/providers/ThemeProvider";
import { usePreferences } from "@/features/preferences/hooks/usePreferences";
import { usePushNotificationRouting } from "@/shared/native/usePushNotificationRouting";
import { useFoursquareTracking } from "@/shared/native/useFoursquareTracking";
import { useEntitlementRequiredRouter } from "@/shared/native/useEntitlementRequiredRouter";
import { useAppForegroundRefresh } from "@/shared/native/useAppForegroundRefresh";
import { useLookupsWarmup } from "@/features/lookups/hooks/useLookupsWarmup";

function PushNotificationListener() {
  usePushNotificationRouting();
  return null;
}

function FoursquareTrackingListener() {
  useFoursquareTracking();
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
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemePreferenceBinder />
            <PushNotificationListener />
            <FoursquareTrackingListener />
            <EntitlementRequiredRouter />
            <AppForegroundRefresh />
            <LookupsWarmup />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
