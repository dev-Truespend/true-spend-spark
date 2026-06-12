import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeApi } from "@/features/cards/api/home.api";
import { getCurrentCoords } from "@/shared/native/location";
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
      // Foreground geo: resolve the device's coordinates, then ask the server for the nearby best
      // card. Runs in parallel with the home (last-visited replay) call. getCurrentCoords returns
      // null when location is denied/unavailable; a nearby failure must not break the screen.
      const coords = await getCurrentCoords();
      const [home, categories, nearby] = await Promise.all([
        homeApi.getHome(),
        homeApi.getCategories(),
        coords
          ? homeApi
              .getNearby({ lat: coords.lat, lng: coords.lng, accuracyMeters: coords.accuracyMeters })
              .catch(() => null)
          : Promise.resolve(null)
      ]);

      // Prefer the live nearby recommendation when the server resolved a confident merchant; always
      // keep home's portfolio + empty state so the screen renders the same regardless of geo.
      const nearbyRecommendation = nearby?.data?.recommendation ?? null;
      const merged = nearbyRecommendation
        ? { ...home.data, recommendation: nearbyRecommendation }
        : home.data;

      return {
        home: merged,
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
