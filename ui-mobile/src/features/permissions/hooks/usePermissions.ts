import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/features/permissions/api/permissions.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function usePermissions() {
  return useQuery({
    queryKey: QueryKeys.Permissions,
    queryFn: async () => (await permissionsApi.get()).data,
    staleTime: 30_000
  });
}
