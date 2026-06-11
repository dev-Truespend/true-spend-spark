import { Slot } from "expo-router";
import { Text } from "react-native";
import { AppProviders } from "@/providers/AppProviders";
import { useAppFonts } from "@/shared/theme/fonts";
// Registers the geo-arrival background location task (TaskManager.defineTask) at module load, before
// the OS can fire it on a background/killed-app relaunch (10a).
import "@/shared/native/arrival/backgroundArrivalTask";

// Cap accessibility Dynamic Type scaling at 1.3× our rendered sizes.
// iOS Settings → Display & Brightness → Text Size can go up to ~3.1×, which
// blows out card/list layouts. 1.3× still respects accessibility intent.
// Mutating defaultProps once at module load is the canonical RN pattern for this.
(Text as unknown as { defaultProps?: { maxFontSizeMultiplier?: number } }).defaultProps =
  (Text as unknown as { defaultProps?: { maxFontSizeMultiplier?: number } }).defaultProps ?? {};
(Text as unknown as { defaultProps: { maxFontSizeMultiplier: number } }).defaultProps.maxFontSizeMultiplier = 1.3;

export default function RootLayout() {
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
