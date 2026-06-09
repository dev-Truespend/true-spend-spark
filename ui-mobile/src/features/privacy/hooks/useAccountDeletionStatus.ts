import { useQuery } from "@tanstack/react-query";
import { privacyApi } from "@/features/privacy/api/privacy.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useAccountDeletionStatus() {
  const query = useQuery({
    queryKey: QueryKeys.AccountDeletionStatus,
    queryFn: () => privacyApi.getDeletionStatus(),
    staleTime: 30_000
  });
  return {
    status: query.data?.data,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
