import { useMutation } from "@tanstack/react-query";

/* region: archive — manual transaction delete hook (removed from MVP)
 *
 * useDeleteTransaction is archived. The hook is preserved as a no-op mutation
 * so legacy callers still resolve at compile time. The original implementation
 * validated id with transactionIdSchema and called transactionsApi.deleteTransaction.
 *
 *   import { useMutation, useQueryClient } from "@tanstack/react-query";
 *   import { transactionsApi } from "@/features/transactions/api/transactions.api";
 *   import { transactionIdSchema } from "@/features/transactions/schemas/transactions.schema";
 *   import { QueryKeys } from "@/shared/constants/QueryKeys";
 *
 *   export function useDeleteTransaction() {
 *     const queryClient = useQueryClient();
 *     return useMutation({
 *       mutationFn: (input: unknown) => {
 *         const id = transactionIdSchema.parse(input);
 *         return transactionsApi.deleteTransaction(id);
 *       },
 *       onSuccess: () => {
 *         queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
 *       }
 *     });
 *   }
 *
 * endregion */

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: (_input: unknown) => {
      void _input;
      return Promise.reject(new Error("Manual transaction delete is not available in this build."));
    }
  });
}
