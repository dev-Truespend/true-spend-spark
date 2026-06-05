export type Money = {
  amount: number;
  currencyCode: string;
  display: string;
};

export type HomeCardSummary = {
  id: number;
  displayName: string;
  issuerName: string;
  lastFour?: string | null;
  source: string;
  isPrimary: boolean;
  syncStatus: string;
  cardArtUrl?: string | null;
};

export type Merchant = {
  id: number;
  name: string;
  categoryCode: string;
  isMultiCategory: boolean;
  address?: string | null;
};

export type RecommendationCard = {
  card: HomeCardSummary;
  expectedRewardRate: number;
  expectedReward: Money;
  reason: string;
  rank: number;
};

export type Recommendation = {
  id: number;
  merchant: Merchant;
  categoryCode: string;
  recommendedCard: RecommendationCard;
  reason: string;
  runnerUpCards: RecommendationCard[];
  coverageWarning?: string | null;
};

export type HomeEmptyState = {
  title: string;
  body: string;
  primaryActionCode: string;
  secondaryActionCode: string;
  upgradeMessage?: string | null;
};

export type RecommendationResponse = {
  recommendation?: Recommendation | null;
  emptyState?: HomeEmptyState | null;
};

export type Category = {
  id: number;
  code: string;
  displayName: string;
  icon?: string | null;
};
