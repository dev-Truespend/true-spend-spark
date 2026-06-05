import { CardSummary } from "@/shared/types/card.types";
import {
  MissedReward,
  MissedRewardEventsResponse,
  Money,
  Transaction,
  TransactionDetail,
  TransactionDetailResponse,
  TransactionRewardResult,
  TransactionsListResponse
} from "@/features/transactions/types/transactions.types";

function toCard(raw: CardSummary): CardSummary {
  return {
    ...raw,
    issuerName: raw.issuerName ?? "",
    syncStatus: raw.syncStatus ?? "active"
  };
}

function toMoney(raw: Money): Money {
  return {
    amount: raw.amount,
    currencyCode: raw.currencyCode,
    formatted: raw.formatted ?? `${raw.currencyCode} ${raw.amount.toFixed(2)}`
  };
}

function toTransaction(raw: Transaction): Transaction {
  return {
    ...raw,
    amount: toMoney(raw.amount),
    card: toCard(raw.card),
    earnedReward: raw.earnedReward ? toMoney(raw.earnedReward) : raw.earnedReward,
    missedReward: raw.missedReward ? toMoney(raw.missedReward) : raw.missedReward
  };
}

function toTransactionDetail(raw: TransactionDetail): TransactionDetail {
  return {
    ...raw,
    amount: toMoney(raw.amount),
    card: toCard(raw.card)
  };
}

function toRewardResult(raw: TransactionRewardResult): TransactionRewardResult {
  return {
    ...raw,
    earnedAmount: toMoney(raw.earnedAmount)
  };
}

function toMissedReward(raw: MissedReward): MissedReward {
  return {
    ...raw,
    actualCard: toCard(raw.actualCard),
    betterCard: toCard(raw.betterCard),
    actualReward: toMoney(raw.actualReward),
    potentialReward: toMoney(raw.potentialReward),
    missedReward: toMoney(raw.missedReward)
  };
}

export function toDomainTransactions(response: TransactionsListResponse): TransactionsListResponse {
  return {
    ...response,
    transactions: response.transactions.map(toTransaction)
  };
}

export function toDomainTransactionDetail(response: TransactionDetailResponse): TransactionDetailResponse {
  return {
    ...response,
    transaction: toTransactionDetail(response.transaction),
    rewardResult: response.rewardResult ? toRewardResult(response.rewardResult) : response.rewardResult,
    missedReward: response.missedReward ? toMissedReward(response.missedReward) : response.missedReward
  };
}

export function toDomainMissedRewards(response: MissedRewardEventsResponse): MissedRewardEventsResponse {
  return {
    missedRewards: response.missedRewards.map(toMissedReward)
  };
}
