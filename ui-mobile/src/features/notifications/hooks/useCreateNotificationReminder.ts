import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications.api";
import { createNotificationReminderSchema } from "@/features/notifications/schemas/notifications.schema";
import { CreateNotificationReminderInput } from "@/features/notifications/types/notifications.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCreateNotificationReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNotificationReminderInput) => {
      const validated = createNotificationReminderSchema.parse(body);
      return notificationsApi.createReminder(validated);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.NotificationReminders });
    }
  });
}
