import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationSettingsApi } from "@/features/notification-settings/api/notification-settings.api";
import {
  updateNotificationTypePreferenceSchema,
  UpdateNotificationTypePreferenceInput
} from "@/features/notification-settings/schemas/notification-settings.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUpdateNotificationTypePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateNotificationTypePreferenceInput) => {
      const parsed = updateNotificationTypePreferenceSchema.parse(body);
      return notificationSettingsApi.updateTypePreference(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.NotificationSettings });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.NotificationTypes });
    }
  });
}
