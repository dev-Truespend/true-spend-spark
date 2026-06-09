import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SyncBanner } from "@/shared/components/SyncBanner";
import { useSyncStatus } from "@/features/sync/hooks/useSyncStatus";

// Renders only when sync state is interesting: offline or pending uploads.
// Mounted in (app)/_layout.tsx so every authed screen surfaces sync issues
// the same way (mockup 8.5).
export function GlobalSyncBanner() {
  const router = useRouter();
  const { status } = useSyncStatus();
  if (!status) return null;

  const online = status.online;
  const pending = status.pendingCount;
  if (online && pending === 0) return null;

  const tone = !online ? "offline" : "warn";
  const message = !online
    ? "You're offline — viewing cached data"
    : `${pending} pending upload${pending === 1 ? "" : "s"} — tap to retry`;

  return (
    <Pressable onPress={() => router.push("/(app)/profile/sync")} accessibilityRole="button">
      <SyncBanner tone={tone} message={message} />
    </Pressable>
  );
}
