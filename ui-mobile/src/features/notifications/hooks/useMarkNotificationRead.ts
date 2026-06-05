import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications.api";
import { notificationIdSchema } from "@/features/notifications/schemas/notifications.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(notificationIdSchema.parse(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Notifications() });
    }
  });
}
