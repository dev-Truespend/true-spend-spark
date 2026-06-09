import { apiGet, apiPost } from "@/shared/api/client";
import { Category, RecommendationResponse } from "@/features/cards/types/home.types";
import {
  CreateMerchantVisitInput,
  RefreshRecommendationInput,
  UpdateRecommendationCategoryInput
} from "@/features/cards/schemas/home.schema";

export const homeApi = {
  getHome: () => apiGet<RecommendationResponse>("/api/v1/recommendations/home"),
  refresh: (input: RefreshRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/refresh", input),
  changeCategory: (input: UpdateRecommendationCategoryInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/category", input),
  recordVisit: (input: CreateMerchantVisitInput) =>
    apiPost("/api/v1/merchants/visits", input),
  getCategories: () => apiGet<{ categories: Category[] }>("/api/v1/card-catalog/categories")
};
