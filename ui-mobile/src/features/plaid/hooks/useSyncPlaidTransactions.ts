import { useMutation, useQueryClient } from "@tanstack/react-query";
import { plaidApi } from "@/features/plaid/api/plaid.api";
import { syncPlaidTransactionsSchema } from "@/features/plaid/schemas/plaid.schema";
import { SyncPlaidTransactionsInput } from "@/features/plaid/types/plaid.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useSyncPlaidTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SyncPlaidTransactionsInput = {}) => {
      const parsed = syncPlaidTransactionsSchema.parse(input);
      return plaidApi.syncTransactions(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.PlaidConnections });
    }
  });
}
