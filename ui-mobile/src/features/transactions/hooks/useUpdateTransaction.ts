import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { updateTransactionSchema } from "@/features/transactions/schemas/transactions.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUpdateTransaction(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: unknown) => {
      const validated = updateTransactionSchema.parse(input);
      return transactionsApi.updateTransaction(id, validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.TransactionDetail(id) });
    }
  });
}
