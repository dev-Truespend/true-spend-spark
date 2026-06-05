import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "@/features/insights/api/analytics.api";
import { toDomainAIInsights } from "@/features/insights/mappers/analytics.mapper";
import { dismissInsightSchema } from "@/features/insights/schemas/insights.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useDismissAIInsight() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (insightId: number) => {
      const { insightId: validatedId } = dismissInsightSchema.parse({ insightId });
      return analyticsApi.dismissInsight(validatedId);
    },
    onSuccess: (response) => {
      if (response.data) {
        queryClient.setQueryData(QueryKeys.AIInsights, toDomainAIInsights(response.data));
      }
    }
  });

  return {
    dismiss: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null
  };
}
