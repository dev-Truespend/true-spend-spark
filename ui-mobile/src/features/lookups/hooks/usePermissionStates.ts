import { useQuery } from "@tanstack/react-query";
import { lookupsApi } from "@/features/lookups/api/lookups.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function usePermissionStates() {
  return useQuery({
    queryKey: QueryKeys.LookupsPermissionStates,
    queryFn: async () => (await lookupsApi.permissionStates()).data.permissionStates,
    staleTime: 24 * 60 * 60 * 1000
  });
}
