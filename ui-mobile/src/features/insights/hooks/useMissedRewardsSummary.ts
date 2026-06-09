import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/features/insights/api/analytics.api";
import { toDomainMissedRewardsSummary } from "@/features/insights/mappers/analytics.mapper";
import { AnalyticsPeriod } from "@/features/insights/types/analytics.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useMissedRewardsSummary(period: AnalyticsPeriod) {
  const query = useQuery({
    queryKey: QueryKeys.MissedRewardsSummary(period),
    queryFn: async () => {
      const response = await analyticsApi.getMissedRewardsSummary(period);
      return toDomainMissedRewardsSummary(response.data!);
    }
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
