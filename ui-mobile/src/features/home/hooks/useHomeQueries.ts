import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeApi } from "@/features/home/api/home.api";
import {
  createMerchantVisitSchema,
  inStoreRecommendationSchema,
  refreshRecommendationSchema,
  resolveMerchantSchema,
  updateRecommendationCategorySchema,
  type CreateMerchantVisitInput,
  type InStoreRecommendationInput,
  type RefreshRecommendationInput,
  type ResolveMerchantInput,
  type UpdateRecommendationCategoryInput
} from "@/features/home/schemas/home.schema";
import { searchFoursquarePlaces } from "@/shared/native/foursquareClient";

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

export function useDetectMerchantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { query: string; ll?: { lat: number; lng: number } }) => {
      const places = await searchFoursquarePlaces({ query: input.query, ll: input.ll, limit: 1 });
      const place = places[0];
      if (!place) {
        throw new Error(`No Foursquare result for "${input.query}".`);
      }
      const resolveInput: ResolveMerchantInput = resolveMerchantSchema.parse({
        name: place.name,
        provider: "foursquare",
        providerPlaceId: place.fsq_id,
        lat: place.geocodes?.main?.latitude,
        lng: place.geocodes?.main?.longitude,
        address: [place.location?.address, place.location?.locality, place.location?.region].filter(Boolean).join(", ") || undefined
      });
      const resolved = await homeApi.resolveMerchant(resolveInput);
      const inStoreInput: InStoreRecommendationInput = inStoreRecommendationSchema.parse({
        merchantId: resolved.data.merchant.id,
        categoryCode: resolved.data.merchant.categoryCode
      });
      const recommendation = await homeApi.getInStore(inStoreInput);
      return { merchant: resolved.data.merchant, recommendation: recommendation.data };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.home });
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
