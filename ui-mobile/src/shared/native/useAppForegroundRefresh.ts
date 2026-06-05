import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/shared/constants/QueryKeys";

const REFRESH_KEYS = [
  QueryKeys.Entitlements,
  QueryKeys.Permissions,
  QueryKeys.BillingSubscription
];

export function useAppForegroundRefresh(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if (previous.match(/inactive|background/) && next === "active") {
        for (const key of REFRESH_KEYS) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [queryClient]);
}
