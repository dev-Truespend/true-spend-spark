import { CardSummary } from "@/shared/types/card.types";

export type Money = {
  amount: number;
  currencyCode: string;
  formatted: string;
};

export type Transaction = {
  id: number;
  merchantName: string;
  amount: Money;
  card: CardSummary;
  categoryCode?: string | null;
  categoryName?: string | null;
  transactionDate: string;
  transactionTime?: string | null;
  locationLabel?: string | null;
  source: string;
  isPending: boolean;
  earnedReward?: Money | null;
  missedReward?: Money | null;
  syncStatus?: string | null;
};

export type TransactionDetail = {
  id: number;
  merchantName: string;
  amount: Money;
  card: CardSummary;
  categoryCode?: string | null;
  categoryName?: string | null;
  transactionDate: string;
  transactionTime?: string | null;
  locationLabel?: string | null;
  source: string;
  isPending: boolean;
};

export type TransactionRewardResult = {
  earnedRate: number;
  earnedAmount: Money;
  rewardCurrencyCode?: string | null;
};

export type MissedReward = {
  id: number;
  transactionId: number;
  merchantName: string;
  actualCard: CardSummary;
  betterCard: CardSummary;
  actualReward: Money;
  potentialReward: Money;
  missedReward: Money;
  isDismissed: boolean;
};

export type TransactionsListResponse = {
  transactions: Transaction[];
  emptyState: boolean;
};

export type TransactionDetailResponse = {
  transaction: TransactionDetail;
  rewardResult?: TransactionRewardResult | null;
  missedReward?: MissedReward | null;
};

export type TransactionRewardResultResponse = {
  earnedReward?: TransactionRewardResult | null;
  missedReward?: MissedReward | null;
};

export type MissedRewardEventsResponse = {
  missedRewards: MissedReward[];
};

export type CreateTransactionInput = {
  merchantName: string;
  amount: number;
  cardId: number;
  categoryCode: string;
  transactionDate: string;
  transactionTime?: string | null;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

export type UpdateTransactionInput = {
  merchantName?: string | null;
  amount?: number | null;
  cardId?: number | null;
  categoryCode?: string | null;
  transactionDate?: string | null;
  transactionTime?: string | null;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};
