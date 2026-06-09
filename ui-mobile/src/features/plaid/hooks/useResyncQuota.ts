import { useQuery } from "@tanstack/react-query";
import { plaidApi } from "@/features/plaid/api/plaid.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

// Pro-only daily manual re-sync allowance. Used to show remaining syncs and gate the sync action.
export function useResyncQuota(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: QueryKeys.PlaidResyncQuota,
    queryFn: async () => {
      const response = await plaidApi.getResyncQuota();
      return response.data ?? null;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000
  });

  return {
    quota: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
