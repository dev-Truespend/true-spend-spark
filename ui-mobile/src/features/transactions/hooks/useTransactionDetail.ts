import { useQuery } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { toDomainTransactionDetail } from "@/features/transactions/mappers/transactions.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useTransactionDetail(id: number) {
  const query = useQuery({
    queryKey: QueryKeys.TransactionDetail(id),
    queryFn: async () => {
      const response = await transactionsApi.getTransaction(id);
      return toDomainTransactionDetail(response.data);
    },
    enabled: id > 0
  });

  return {
    transaction: query.data?.transaction ?? null,
    rewardResult: query.data?.rewardResult ?? null,
    missedReward: query.data?.missedReward ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
