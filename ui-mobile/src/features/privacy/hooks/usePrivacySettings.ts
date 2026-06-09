import { useQuery } from "@tanstack/react-query";
import { privacyApi } from "@/features/privacy/api/privacy.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function usePrivacySettings() {
  const query = useQuery({
    queryKey: QueryKeys.PrivacySettings,
    queryFn: () => privacyApi.getSettings(),
    staleTime: 60_000
  });
  return {
    settings: query.data?.data,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch
  };
}
