import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications.api";
import { notificationsMapper } from "@/features/notifications/mappers/notifications.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useNotificationReminders() {
  const query = useQuery({
    queryKey: QueryKeys.NotificationReminders,
    queryFn: async () => {
      const response = await notificationsApi.getReminders();
      return response.data;
    }
  });

  return {
    reminders: query.data?.reminders.map(notificationsMapper.reminder) ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
