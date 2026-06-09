import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncApi } from "@/features/sync/api/sync.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useRetrySync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncApi.retry(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.SyncStatus });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Notifications() });
    }
  });
}
