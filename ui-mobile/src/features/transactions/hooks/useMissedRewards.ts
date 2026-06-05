import { useQuery } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { toDomainMissedRewards } from "@/features/transactions/mappers/transactions.mapper";
import { AppError } from "@/shared/errors/AppError";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useMissedRewards() {
  const query = useQuery({
    queryKey: QueryKeys.MissedRewards,
    queryFn: async () => {
      const response = await transactionsApi.getMissedRewards();
      return toDomainMissedRewards(response.data);
    }
  });

  return {
    missedRewards: query.data?.missedRewards ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof AppError ? query.error.message : query.error?.message ?? null
  };
}
