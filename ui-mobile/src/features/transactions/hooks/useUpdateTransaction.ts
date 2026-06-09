import { useMutation } from "@tanstack/react-query";

/* region: archive — manual transaction update hook (removed from MVP)
 *
 * useUpdateTransaction is archived. The hook is preserved as a no-op mutation
 * so legacy callers still resolve at compile time. The original implementation
 * validated input against updateTransactionSchema and called
 * transactionsApi.updateTransaction(id, body).
 *
 *   import { useMutation, useQueryClient } from "@tanstack/react-query";
 *   import { transactionsApi } from "@/features/transactions/api/transactions.api";
 *   import { updateTransactionSchema } from "@/features/transactions/schemas/transactions.schema";
 *   import { QueryKeys } from "@/shared/constants/QueryKeys";
 *
 *   export function useUpdateTransaction(id: number) {
 *     const queryClient = useQueryClient();
 *     return useMutation({
 *       mutationFn: (input: unknown) => {
 *         const validated = updateTransactionSchema.parse(input);
 *         return transactionsApi.updateTransaction(id, validated);
 *       },
 *       onSuccess: () => {
 *         queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
 *         queryClient.invalidateQueries({ queryKey: QueryKeys.TransactionDetail(id) });
 *       }
 *     });
 *   }
 *
 * endregion */

export function useUpdateTransaction(_id: number) {
  void _id;
  return useMutation({
    mutationFn: (_input: unknown) => {
      void _input;
      return Promise.reject(new Error("Manual transaction edit is not available in this build."));
    }
  });
}
