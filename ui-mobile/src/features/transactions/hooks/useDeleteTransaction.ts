import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { transactionIdSchema } from "@/features/transactions/schemas/transactions.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: unknown) => {
      const id = transactionIdSchema.parse(input);
      return transactionsApi.deleteTransaction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
    }
  });
}
