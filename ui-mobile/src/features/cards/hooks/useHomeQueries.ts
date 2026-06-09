import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeApi } from "@/features/cards/api/home.api";
import {
  createMerchantVisitSchema,
  refreshRecommendationSchema,
  updateRecommendationCategorySchema,
  type CreateMerchantVisitInput,
  type RefreshRecommendationInput,
  type UpdateRecommendationCategoryInput
} from "@/features/cards/schemas/home.schema";

export const homeQueryKeys = {
  home: ["home", "recommendations"] as const
};

export function useHomeRecommendationQuery() {
  return useQuery({
    queryKey: homeQueryKeys.home,
    queryFn: async () => {
      const [home, categories] = await Promise.all([homeApi.getHome(), homeApi.getCategories()]);
      return {
        home: home.data,
        categories: categories.data.categories
      };
    }
  });
}

export function useChangeRecommendationCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRecommendationCategoryInput) => {
      const parsed = updateRecommendationCategorySchema.parse({
        recommendationId: input.recommendationId,
        categoryCode: input.categoryCode
      });
      const recommendation = await homeApi.changeCategory(parsed);
      return recommendation.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.home });
    }
  });
}

// Recording a merchant visit writes a row + emits an outbox event. The category
// chip can be tapped many times before the user settles, so this mutation is
// fired through a debounced trigger in `useHomeRecommendations` rather than on
// every tap.
export function useRecordMerchantVisitMutation() {
  return useMutation({
    mutationFn: (input: { merchantId: number; categoryCode: string }) => {
      const visitInput: CreateMerchantVisitInput = createMerchantVisitSchema.parse({
        merchantId: input.merchantId,
        selectedCategoryCode: input.categoryCode,
        visitedAt: new Date().toISOString()
      });
      return homeApi.recordVisit(visitInput);
    }
  });
}

export function useRefreshRecommendationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RefreshRecommendationInput) => {
      const parsed = refreshRecommendationSchema.parse(input);
      const recommendation = await homeApi.refresh(parsed);
      return recommendation.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.home });
    }
  });
}
