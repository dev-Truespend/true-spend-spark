import { AIInsight, AIInsightsResponse, MissedReward, MissedRewardsSummary, RewardsSummary } from "@/features/insights/types/analytics.types";

export function toDomainRewardsSummary(response: RewardsSummary): RewardsSummary {
  return {
    ...response,
    topMissedRewards: response.topMissedRewards.map(toDomainMissedReward),
    dailyBreakdown: response.dailyBreakdown.map((item) => ({ ...item })),
    categoryBreakdown: response.categoryBreakdown.map((item) => ({ ...item }))
  };
}

export function toDomainMissedRewardsSummary(response: MissedRewardsSummary): MissedRewardsSummary {
  return {
    ...response,
    topMissedRewards: response.topMissedRewards.map(toDomainMissedReward)
  };
}

function toDomainMissedReward(vm: MissedReward): MissedReward {
  return { ...vm };
}

export function toDomainAIInsights(response: AIInsightsResponse): AIInsight[] {
  return response.insights.map((insight) => ({ ...insight }));
}
