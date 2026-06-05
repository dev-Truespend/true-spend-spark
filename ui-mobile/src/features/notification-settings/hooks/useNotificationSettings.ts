import { useQuery } from "@tanstack/react-query";
import { notificationSettingsApi } from "@/features/notification-settings/api/notification-settings.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useNotificationSettings() {
  return useQuery({
    queryKey: QueryKeys.NotificationSettings,
    queryFn: notificationSettingsApi.get
  });
}

export function useNotificationTypes() {
  return useQuery({
    queryKey: QueryKeys.NotificationTypes,
    queryFn: notificationSettingsApi.getTypes,
    staleTime: 1000 * 60 * 60
  });
}
