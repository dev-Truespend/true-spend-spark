import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Notifications() });
    }
  });
}
