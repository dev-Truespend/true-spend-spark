import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationSettingsApi, NotificationSettings } from "@/features/notification-settings/api/notification-settings.api";
import { updateNotificationSettingsSchema } from "@/features/notification-settings/schemas/notification-settings.schema";
import { devicesApi } from "@/shared/api/devices.api";
import { ensurePushToken } from "@/shared/native/pushNotifications";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<NotificationSettings, "types">) => {
      const parsed = updateNotificationSettingsSchema.parse(body);
      if (parsed.pushEnabled) {
        const result = await ensurePushToken();
        await devicesApi.register({ pushToken: result.token });
      }
      return notificationSettingsApi.update(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.NotificationSettings });
    }
  });
}
