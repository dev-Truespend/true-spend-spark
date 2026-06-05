import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { missedRewardIdSchema } from "@/features/transactions/schemas/transactions.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useMarkNotAMiss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: unknown) => {
      const missedRewardId = missedRewardIdSchema.parse(input);
      return transactionsApi.markNotAMiss(missedRewardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.MissedRewards });
      queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
    }
  });
}
