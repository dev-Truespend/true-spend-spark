import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications.api";
import { reminderIdSchema } from "@/features/notifications/schemas/notifications.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useDeleteNotificationReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.deleteReminder(reminderIdSchema.parse(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.NotificationReminders });
    }
  });
}
