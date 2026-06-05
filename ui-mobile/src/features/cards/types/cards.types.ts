export type { CardSummary } from "@/shared/types/card.types";
import type { CardSummary } from "@/shared/types/card.types";

export type CardLimits = {
  plaidUsed: number;
  plaidLimit?: number | null;
  manualUsed: number;
  manualLimit?: number | null;
  unlimited: boolean;
};

export type CardsListResponse = {
  cards: CardSummary[];
  limits: CardLimits;
};

export type RewardRule = {
  categoryCode: string;
  categoryName: string;
  multiplier: number;
  capDisplay?: string | null;
  notes?: string | null;
};

export type MonthlyRewardContribution = {
  points: number;
  estimatedValue: number;
  currencyCode: string;
  periodLabel: string;
};

export type CardTerms = {
  annualFee?: number | null;
  purchaseApr?: string | null;
  foreignTransactionFee?: string | null;
  termsSummary?: string | null;
};

export type CardDetail = {
  card: CardSummary;
  rewardRules: RewardRule[];
  monthlyRewardContribution?: MonthlyRewardContribution | null;
  terms?: CardTerms | null;
};

export type RewardOverride = {
  categoryCode: string;
  categoryName: string;
  multiplier: number;
  notes?: string | null;
};

export type RewardOverridesResponse = {
  rewardRules: RewardOverride[];
};

export type CreateManualCardInput = {
  cardProductId: number;
  issuerId: number;
  nickname?: string;
  lastFour?: string;
  isPrimary: boolean;
};

export type UpdateCardInput = {
  nickname?: string;
  lastFour?: string;
  isPrimary: boolean;
};

export type UpsertRewardOverrideInput = {
  categoryCode: string;
  multiplier: number;
  notes?: string;
};

export type DeleteRewardOverrideInput = {
  categoryCode: string;
};
