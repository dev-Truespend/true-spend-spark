export type RewardUnit = 'percent' | 'points_per_dollar' | 'miles_per_dollar';

export type NormalizedCategory =
  | 'dining'
  | 'groceries'
  | 'shopping'
  | 'travel'
  | 'gas'
  | 'streaming'
  | 'drugstore'
  | 'entertainment'
  | 'other';

export interface RewardEstimate {
  rewardRate: number;
  rewardUnit: RewardUnit;
  estimatedValueCents: number;
  rewardLabel: string;
}

export interface RankedRewardCard extends RewardEstimate {
  userCreditCardId: string;
  cardCatalogId?: string | null;
  cardName: string;
  issuer?: string | null;
  reasonCodes: string[];
}
