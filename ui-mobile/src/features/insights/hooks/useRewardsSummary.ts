import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/features/insights/api/analytics.api";
import { toDomainRewardsSummary } from "@/features/insights/mappers/analytics.mapper";
import { AnalyticsPeriod } from "@/features/insights/types/analytics.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useRewardsSummary(period: AnalyticsPeriod) {
  const query = useQuery({
    queryKey: QueryKeys.RewardsSummary(period),
    queryFn: async () => {
      const response = await analyticsApi.getRewardsSummary(period);
      return toDomainRewardsSummary(response.data!);
    }
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
