import { RecommendationResponse } from "@/features/home/types/home.types";

export function isEmptyHome(response: RecommendationResponse | null) {
  return Boolean(response?.emptyState && !response.recommendation);
}
