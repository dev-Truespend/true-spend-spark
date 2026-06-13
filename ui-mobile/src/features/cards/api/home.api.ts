import { apiGet, apiPost } from "@/shared/api/client";
import {
  Category,
  NearbyMerchantsResponse,
  RecentVisitsResponse,
  RecommendationResponse
} from "@/features/cards/types/home.types";
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

// Map viewport (bounding box) + the point to rank distance from. Returns up to ~30 pins.
export type NearbyMerchantsInput = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  centerLat: number;
  centerLng: number;
  limit?: number;
};

// A tapped pin → resolve merchant + best card. No visit is recorded server-side.
export type PlaceRecommendationInput = {
  providerPlaceId: string;
  name: string;
  lat: number;
  lng: number;
  categoryCode?: string | null;
  estimatedAmount?: number | null;
};

export const homeApi = {
  getHome: () => apiGet<RecommendationResponse>("/api/v1/recommendations/home"),
  getNearby: (input: NearbyRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/nearby", input),
  getNearbyMerchants: (input: NearbyMerchantsInput) =>
    apiPost<NearbyMerchantsResponse>("/api/v1/recommendations/nearby-merchants", input),
  getPlaceRecommendation: (input: PlaceRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/place", input),
  refresh: (input: RefreshRecommendationInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/refresh", input),
  changeCategory: (input: UpdateRecommendationCategoryInput) =>
    apiPost<RecommendationResponse>("/api/v1/recommendations/category", input),
  recordVisit: (input: CreateMerchantVisitInput) =>
    apiPost("/api/v1/merchants/visits", input),
  getRecentVisits: (limit?: number) =>
    apiGet<RecentVisitsResponse>("/api/v1/merchants/recent-visits", limit ? { limit } : undefined),
  getCategories: () => apiGet<{ categories: Category[] }>("/api/v1/card-catalog/categories")
};
