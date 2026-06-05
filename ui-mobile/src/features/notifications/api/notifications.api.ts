import { apiGet, apiPost } from "@/shared/api/client";
import {
  NotificationsResponse,
  NotificationDetailResponse,
  NotificationRemindersResponse,
  CreateNotificationReminderInput
} from "@/features/notifications/types/notifications.types";

export const notificationsApi = {
  getNotifications: (filter = "all") =>
    apiGet<NotificationsResponse>("/api/v1/notifications", { filter }),

  getNotificationDetail: (id: number) =>
    apiGet<NotificationDetailResponse>(`/api/v1/notifications/${id}`),

  markRead: (id: number) =>
    apiPost<NotificationsResponse>(`/api/v1/notifications/${id}/read`, {}),

  markAllRead: () =>
    apiPost<NotificationsResponse>("/api/v1/notifications/read-all", {}),

  getReminders: () =>
    apiGet<NotificationRemindersResponse>("/api/v1/notification-reminders"),

  createReminder: (body: CreateNotificationReminderInput) =>
    apiPost<NotificationRemindersResponse>("/api/v1/notification-reminders", body),

  deleteReminder: (id: number) =>
    apiPost<NotificationRemindersResponse>(`/api/v1/notification-reminders/${id}/delete`, {})
};
