import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/features/insights/api/analytics.api";
import { toDomainAIInsights } from "@/features/insights/mappers/analytics.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

type Options = { enabled?: boolean };

export function useAIInsights(options: Options = {}) {
  const query = useQuery({
    queryKey: QueryKeys.AIInsights,
    queryFn: async () => {
      const response = await analyticsApi.getAIInsights();
      return toDomainAIInsights(response.data!);
    },
    enabled: options.enabled ?? true
  });

  return {
    insights: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
