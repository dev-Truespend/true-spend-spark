import { apiGet, apiPost } from "@/shared/api/client";
import { Category, Merchant, RecommendationResponse } from "@/features/home/types/home.types";
import {
  CreateMerchantVisitInput,
  InStoreRecommendationInput,
  RefreshRecommendationInput,
  ResolveMerchantInput,
  UpdateRecommendationCategoryInput
} from "@/features/home/schemas/home.schema";

export const homeApi = {
  getHome: () => apiGet<RecommendationResponse>("/api/v1/recommendations/home"),
  resolveMerchant: (input: ResolveMerchantInput) =>
    apiPost<{ merchant: Merchant }>("/api/v1/merchants/resolve", input),
  getInStore: (input: InStoreRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/in-store", input),
  refresh: (input: RefreshRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/refresh", input),
  changeCategory: (input: UpdateRecommendationCategoryInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/category", input),
  recordVisit: (input: CreateMerchantVisitInput) =>
    apiPost("/api/v1/merchants/visits", input),
  getCategories: () => apiGet<{ categories: Category[] }>("/api/v1/card-catalog/categories")
};
