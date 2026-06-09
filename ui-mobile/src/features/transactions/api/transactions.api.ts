import { apiGet, apiPost } from "@/shared/api/client";
import {
  MissedRewardEventsResponse,
  TransactionCategoriesResponse,
  TransactionDetailResponse,
  TransactionRewardResultResponse,
  TransactionsListResponse
} from "@/features/transactions/types/transactions.types";

export const transactionsApi = {
  getTransactions: (params?: { q?: string; categoryCode?: string; cardId?: number }) =>
    apiGet<TransactionsListResponse>("/api/v1/transactions", params),

  getCategories: () =>
    apiGet<TransactionCategoriesResponse>("/api/v1/transactions/categories"),

  getTransaction: (id: number) =>
    apiGet<TransactionDetailResponse>(`/api/v1/transactions/${id}`),

  getRewardResult: (id: number) =>
    apiGet<TransactionRewardResultResponse>(`/api/v1/transactions/${id}/reward-result`),

  getMissedRewards: () =>
    apiGet<MissedRewardEventsResponse>("/api/v1/missed-rewards"),

  markNotAMiss: (missedRewardId: number) =>
    apiPost<TransactionDetailResponse>(`/api/v1/missed-rewards/${missedRewardId}/not-a-miss`, {})
};

/* region: archive — manual transaction create/update/delete API methods (removed from MVP)
 *
 * The three manual-tx API methods are archived. The matching server endpoints
 * (POST /api/v1/transactions, POST /api/v1/transactions/{id}, POST
 * /api/v1/transactions/{id}/delete) are also archived on the service side.
 *
 *   import { CreateTransactionInput, UpdateTransactionInput } from
 *     "@/features/transactions/types/transactions.types";
 *
 *   createTransaction: (body: CreateTransactionInput) =>
 *     apiPost<TransactionDetailResponse>("/api/v1/transactions", body),
 *
 *   updateTransaction: (id: number, body: UpdateTransactionInput) =>
 *     apiPost<TransactionDetailResponse>(`/api/v1/transactions/${id}`, body),
 *
 *   deleteTransaction: (id: number) =>
 *     apiPost<TransactionsListResponse>(`/api/v1/transactions/${id}/delete`, {}),
 *
 * endregion */
