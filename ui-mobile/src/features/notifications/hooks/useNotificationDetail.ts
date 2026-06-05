import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications.api";
import { notificationsMapper } from "@/features/notifications/mappers/notifications.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useNotificationDetail(id: number) {
  const query = useQuery({
    queryKey: QueryKeys.NotificationDetail(id),
    queryFn: async () => {
      const response = await notificationsApi.getNotificationDetail(id);
      return response.data;
    },
    enabled: id > 0
  });

  const raw = query.data ?? null;

  return {
    detail: raw ? notificationsMapper.detail(raw) : null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
