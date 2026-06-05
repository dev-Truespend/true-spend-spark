import { apiGet, apiPost } from "@/shared/api/client";

export type NotificationType = { code: string; displayName: string; enabled: boolean };

export type NotificationSettings = {
  masterEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  types: NotificationType[];
};

export const notificationSettingsApi = {
  get: () => apiGet<NotificationSettings>("/api/v1/notification-settings"),
  update: (body: Omit<NotificationSettings, "types">) =>
    apiPost<NotificationSettings>("/api/v1/notification-settings", body),
  getTypes: () => apiGet<{ types: NotificationType[] }>("/api/v1/notification-settings/types"),
  updateTypePreference: (body: { typeCode: string; enabled: boolean }) =>
    apiPost<NotificationSettings>("/api/v1/notification-settings/types", body)
};
