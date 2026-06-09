import { useQuery } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useTransactionCategories() {
  return useQuery({
    queryKey: QueryKeys.TransactionCategories,
    queryFn: transactionsApi.getCategories,
    staleTime: 1000 * 60 * 60
  });
}
