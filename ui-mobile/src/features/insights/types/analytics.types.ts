export type AnalyticsPeriod = "week" | "month" | "quarter" | "year";

export type MoneyAmount = {
  amount: number;
  currencyCode: string;
  display: string;
};

export type RewardBreakdownItem = {
  key: string;
  label: string;
  earned: MoneyAmount;
  missed: MoneyAmount;
};

export type MissedReward = {
  id: number;
  transactionId: number;
  merchantName: string;
  actualCard?: string | null;
  betterCard?: string | null;
  actualReward: MoneyAmount;
  potentialReward: MoneyAmount;
  missedReward: MoneyAmount;
  isDismissed: boolean;
};

export type RewardsSummary = {
  earned: MoneyAmount;
  missed: MoneyAmount;
  earnedDelta: MoneyAmount;
  missedDelta: MoneyAmount;
  dailyBreakdown: RewardBreakdownItem[];
  categoryBreakdown: RewardBreakdownItem[];
  topMissedRewards: MissedReward[];
};

export type MissedRewardsSummary = {
  missed: MoneyAmount;
  missedDelta: MoneyAmount;
  topMissedRewards: MissedReward[];
};

export type AIInsight = {
  id: number;
  typeCode: string;
  priority: string;
  title: string;
  body: string;
  generatedAt: string;
};

export type AIInsightsResponse = {
  insights: AIInsight[];
};
