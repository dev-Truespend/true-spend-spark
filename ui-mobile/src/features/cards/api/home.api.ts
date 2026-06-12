import { apiGet, apiPost } from "@/shared/api/client";
import { Category, RecommendationResponse } from "@/features/cards/types/home.types";
import {
  CreateMerchantVisitInput,
  RefreshRecommendationInput,
  UpdateRecommendationCategoryInput
} from "@/features/cards/schemas/home.schema";

// Foreground "open app -> nearby best card" (03). Sends the device's current coordinates; the server
// resolves the nearby merchant (shared place-match) and returns the best-card recommendation.
export type NearbyRecommendationInput = {
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
  estimatedAmount?: number | null;
};

export const homeApi = {
  getHome: () => apiGet<RecommendationResponse>("/api/v1/recommendations/home"),
  getNearby: (input: NearbyRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/nearby", input),
  refresh: (input: RefreshRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/refresh", input),
  changeCategory: (input: UpdateRecommendationCategoryInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/category", input),
  recordVisit: (input: CreateMerchantVisitInput) =>
    apiPost("/api/v1/merchants/visits", input),
  getCategories: () => apiGet<{ categories: Category[] }>("/api/v1/card-catalog/categories")
};
