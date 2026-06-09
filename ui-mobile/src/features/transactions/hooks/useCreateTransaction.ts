import { useMutation } from "@tanstack/react-query";

/* region: archive — manual transaction create hook (removed from MVP)
 *
 * useCreateTransaction is archived. The hook is preserved as a no-op mutation
 * so legacy callers (e.g. the archived TransactionFormScreen) still resolve at
 * compile time. The original implementation validated input against
 * createTransactionSchema and called transactionsApi.createTransaction.
 *
 *   import { useMutation, useQueryClient } from "@tanstack/react-query";
 *   import { transactionsApi } from "@/features/transactions/api/transactions.api";
 *   import { createTransactionSchema } from "@/features/transactions/schemas/transactions.schema";
 *   import { QueryKeys } from "@/shared/constants/QueryKeys";
 *
 *   export function useCreateTransaction() {
 *     const queryClient = useQueryClient();
 *     return useMutation({
 *       mutationFn: (input: unknown) => {
 *         const validated = createTransactionSchema.parse(input);
 *         return transactionsApi.createTransaction(validated);
 *       },
 *       onSuccess: () => {
 *         queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
 *       }
 *     });
 *   }
 *
 * endregion */

export function useCreateTransaction() {
  return useMutation({
    mutationFn: (_input: unknown) => {
      void _input;
      return Promise.reject(new Error("Manual transaction entry is not available in this build."));
    }
  });
}
