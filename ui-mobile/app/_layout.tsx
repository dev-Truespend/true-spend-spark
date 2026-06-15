import * as Sentry from "@sentry/react-native";
import { Slot } from "expo-router";
import { Text } from "react-native";
import { AppProviders } from "@/providers/AppProviders";
import { env } from "@/shared/config/env";
// Registers the geo-arrival background tasks (TaskManager.defineTask) at module load, before the OS can
// fire them on a background/killed-app relaunch (10a): the continuous stop-detection task and the native
// geofence enter/exit task (item 8).
import "@/shared/native/arrival/backgroundArrivalTask";
import "@/shared/native/arrival/geofenceArrivalTask";
import { useAppFonts } from "@/shared/theme/fonts";

// Crash/error reporting. Init as early as possible (module load, before first render) so even a crash on
// the very first screen is captured. Disabled in dev (__DEV__) to keep local noise out of the free-tier
// quota — TestFlight/production builds run with __DEV__ === false and report normally. No performance
// tracing for now (tracesSampleRate 0) — pure crash reporting, which is what we need and stays free.
Sentry.init({
  dsn: env.sentryDsn,
  enabled: !__DEV__ && env.sentryDsn.length > 0,
  environment: env.appEnv,
  tracesSampleRate: 0
});

// Cap accessibility Dynamic Type scaling at 1.3× our rendered sizes.
// iOS Settings → Display & Brightness → Text Size can go up to ~3.1×, which
// blows out card/list layouts. 1.3× still respects accessibility intent.
// Mutating defaultProps once at module load is the canonical RN pattern for this.
(Text as unknown as { defaultProps?: { maxFontSizeMultiplier?: number } }).defaultProps =
  (Text as unknown as { defaultProps?: { maxFontSizeMultiplier?: number } }).defaultProps ?? {};
(Text as unknown as { defaultProps: { maxFontSizeMultiplier: number } }).defaultProps.maxFontSizeMultiplier = 1.3;

function RootLayout() {
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) {
    // Keep the native Expo splash up until Inter is ready so first paint matches the design system.
    return null;
  }
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}

// Sentry.wrap adds the touch/navigation breadcrumb tracking + error boundary around the app root.
export default Sentry.wrap(RootLayout);
