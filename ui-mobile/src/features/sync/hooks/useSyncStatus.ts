import { useQuery } from "@tanstack/react-query";
import { syncApi } from "@/features/sync/api/sync.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useSyncStatus() {
  const query = useQuery({
    queryKey: QueryKeys.SyncStatus,
    queryFn: () => syncApi.getStatus(),
    staleTime: 15_000,
    refetchOnWindowFocus: true
  });
  return {
    status: query.data?.data,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    isFetching: query.isFetching
  };
}
