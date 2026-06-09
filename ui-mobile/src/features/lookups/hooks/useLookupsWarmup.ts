import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { lookupsApi } from "@/features/lookups/api/lookups.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

const LOOKUP_STALE_MS = 24 * 60 * 60 * 1000;

// Prefetches reference data so dropdowns (currencies, permission states, etc.)
// render instantly the first time the user opens a form. Per workflow 12 §47,
// warm-up runs in parallel and never blocks first-screen render.
export function useLookupsWarmup(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: QueryKeys.LookupsCurrencies,
      queryFn: async () => (await lookupsApi.currencies()).data.currencies,
      staleTime: LOOKUP_STALE_MS
    });
    void queryClient.prefetchQuery({
      queryKey: QueryKeys.LookupsPermissionStates,
      queryFn: async () => (await lookupsApi.permissionStates()).data.permissionStates,
      staleTime: LOOKUP_STALE_MS
    });
  }, [queryClient]);
}
