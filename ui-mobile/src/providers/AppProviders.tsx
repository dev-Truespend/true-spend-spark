import { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { usePushNotificationRouting } from "@/shared/native/usePushNotificationRouting";
import { useFoursquareTracking } from "@/shared/native/useFoursquareTracking";
import { useEntitlementRequiredRouter } from "@/shared/native/useEntitlementRequiredRouter";
import { useAppForegroundRefresh } from "@/shared/native/useAppForegroundRefresh";

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

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <PushNotificationListener />
            <FoursquareTrackingListener />
            <EntitlementRequiredRouter />
            <AppForegroundRefresh />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
