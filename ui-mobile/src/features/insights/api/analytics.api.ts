import { apiGet, apiPost } from "@/shared/api/client";
import {
  AIInsightGenerationResponse,
  AIInsightsResponse,
  InsightGenerationRun,
  MissedRewardsSummary,
  RewardsSummary
} from "@/features/insights/types/analytics.types";

export const analyticsApi = {
  getRewardsSummary: (periodCode: string) =>
    apiGet<RewardsSummary>("/api/v1/analytics/rewards-summary", { periodCode }),
  getMissedRewardsSummary: (periodCode: string) =>
    apiGet<MissedRewardsSummary>("/api/v1/analytics/missed-rewards-summary", { periodCode }),
  getAIInsights: () => apiGet<AIInsightsResponse>("/api/v1/ai-insights"),
  generateAIInsights: () => apiPost<AIInsightGenerationResponse>("/api/v1/ai-insights/generate"),
  getGenerationRun: (runId: number) =>
    apiGet<InsightGenerationRun>(`/api/v1/ai-insights/generation/${runId}`),
  dismissInsight: (insightId: number) =>
    apiPost<AIInsightsResponse>(`/api/v1/ai-insights/${insightId}/dismiss`)
};
