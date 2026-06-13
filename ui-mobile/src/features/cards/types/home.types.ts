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

export type PortfolioCategory = {
  categoryCode: string;
  categoryName: string;
  multiplier: number;
};

export type PortfolioCard = {
  card: HomeCardSummary;
  topCategories: PortfolioCategory[];
};

export type RecommendationResponse = {
  recommendation?: Recommendation | null;
  emptyState?: HomeEmptyState | null;
  portfolio?: PortfolioCard[] | null;
};

export type Category = {
  id: number;
  code: string;
  displayName: string;
  icon?: string | null;
};

// A rewardable place rendered as a map pin. Resolves to a merchant + best card only when tapped.
export type NearbyMerchant = {
  providerPlaceId: string;
  name: string;
  lat: number;
  lng: number;
  categoryCode?: string | null;
  categoryName?: string | null;
  chainName?: string | null;
};

export type NearbyMerchantsResponse = {
  merchants: NearbyMerchant[];
};

export type RecentVisit = {
  merchant: Merchant;
  categoryCode: string;
  visitedAt: string;
};

export type RecentVisitsResponse = {
  visits: RecentVisit[];
};
