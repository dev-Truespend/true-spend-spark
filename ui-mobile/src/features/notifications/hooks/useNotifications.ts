import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications.api";
import { notificationsMapper } from "@/features/notifications/mappers/notifications.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useNotifications(filter = "all") {
  const query = useQuery({
    queryKey: QueryKeys.Notifications(filter),
    queryFn: async () => {
      const response = await notificationsApi.getNotifications(filter);
      return response.data;
    }
  });

  return {
    notifications: query.data?.notifications.map(notificationsMapper.notification) ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
