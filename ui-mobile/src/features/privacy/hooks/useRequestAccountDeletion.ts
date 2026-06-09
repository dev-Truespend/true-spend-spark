import { useMutation, useQueryClient } from "@tanstack/react-query";
import { privacyApi } from "@/features/privacy/api/privacy.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useRequestAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => privacyApi.requestDeletion(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.AccountDeletionStatus });
    }
  });
}

export function useCancelAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => privacyApi.cancelDeletion(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.AccountDeletionStatus });
    }
  });
}
