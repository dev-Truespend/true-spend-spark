import { apiGet, apiPost } from "@/shared/api/client";
import {
  AIInsightsResponse,
  MissedRewardsSummary,
  RewardsSummary
} from "@/features/insights/types/analytics.types";

export const analyticsApi = {
  getRewardsSummary: (periodCode: string) =>
    apiGet<RewardsSummary>("/api/v1/analytics/rewards-summary", { periodCode }),
  getMissedRewardsSummary: (periodCode: string) =>
    apiGet<MissedRewardsSummary>("/api/v1/analytics/missed-rewards-summary", { periodCode }),
  // AI insights are generated nightly by the worker (worker-only in MVP); the client only reads + dismisses.
  getAIInsights: () => apiGet<AIInsightsResponse>("/api/v1/ai-insights"),
  dismissInsight: (insightId: number) =>
    apiPost<AIInsightsResponse>(`/api/v1/ai-insights/${insightId}/dismiss`)
};
