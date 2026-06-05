import { useQuery } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { toDomainTransactions } from "@/features/transactions/mappers/transactions.mapper";
import { AppError } from "@/shared/errors/AppError";
import { QueryKeys } from "@/shared/constants/QueryKeys";

type Filters = { q?: string; categoryCode?: string; cardId?: number };

export function useTransactionsList(filters?: Filters) {
  const query = useQuery({
    queryKey: QueryKeys.Transactions(filters),
    queryFn: async () => {
      const response = await transactionsApi.getTransactions(filters);
      return toDomainTransactions(response.data);
    }
  });

  return {
    transactions: query.data?.transactions ?? [],
    emptyState: query.data?.emptyState ?? false,
    isLoading: query.isLoading,
    error: query.error instanceof AppError ? query.error.message : query.error?.message ?? null
  };
}
