import { apiGet, apiPost } from "@/shared/api/client";
import {
  MissedRewardEventsResponse,
  TransactionDetailResponse,
  TransactionRewardResultResponse,
  TransactionsListResponse,
  CreateTransactionInput,
  UpdateTransactionInput
} from "@/features/transactions/types/transactions.types";

export const transactionsApi = {
  getTransactions: (params?: { q?: string; categoryCode?: string; cardId?: number }) =>
    apiGet<TransactionsListResponse>("/api/v1/transactions", params),

  getTransaction: (id: number) =>
    apiGet<TransactionDetailResponse>(`/api/v1/transactions/${id}`),

  getRewardResult: (id: number) =>
    apiGet<TransactionRewardResultResponse>(`/api/v1/transactions/${id}/reward-result`),

  createTransaction: (body: CreateTransactionInput) =>
    apiPost<TransactionDetailResponse>("/api/v1/transactions", body),

  updateTransaction: (id: number, body: UpdateTransactionInput) =>
    apiPost<TransactionDetailResponse>(`/api/v1/transactions/${id}`, body),

  deleteTransaction: (id: number) =>
    apiPost<TransactionsListResponse>(`/api/v1/transactions/${id}/delete`, {}),

  getMissedRewards: () =>
    apiGet<MissedRewardEventsResponse>("/api/v1/missed-rewards"),

  markNotAMiss: (missedRewardId: number) =>
    apiPost<TransactionDetailResponse>(`/api/v1/missed-rewards/${missedRewardId}/not-a-miss`, {})
};
