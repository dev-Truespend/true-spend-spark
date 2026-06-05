import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsApi } from "@/features/transactions/api/transactions.api";
import { createTransactionSchema } from "@/features/transactions/schemas/transactions.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: unknown) => {
      const validated = createTransactionSchema.parse(input);
      return transactionsApi.createTransaction(validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
    }
  });
}
