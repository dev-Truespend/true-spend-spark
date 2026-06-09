import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/shared/constants/QueryKeys";
import { reportDevicePermissions } from "@/shared/native/reportDevicePermissions";

const REFRESH_KEYS = [
  QueryKeys.Entitlements,
  QueryKeys.Permissions,
  QueryKeys.BillingSubscription,
  // 04-cards.md:168 — card list refreshes on foreground; ["cards"] covers list, detail, and reward overrides.
  QueryKeys.Cards,
  QueryKeys.CardLimits,
  QueryKeys.PlaidConnections,
  // 05-transactions.md:126 — transactions refresh on foreground; ["transactions"] covers list and detail.
  QueryKeys.Transactions()
];

export function useAppForegroundRefresh(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    // Cold-start sync once the listener mounts (auth bootstrap may not cover
    // camera/notification states).
    void reportDevicePermissions();
    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if (previous.match(/inactive|background/) && next === "active") {
        for (const key of REFRESH_KEYS) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
        // Re-sync OS permissions so server-side state matches device state
        // after the user may have toggled settings while backgrounded.
        void reportDevicePermissions();
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [queryClient]);
}
