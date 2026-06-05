import { NotificationSettings, NotificationType, UpdateNotificationSettingsInput } from "@/features/notification-settings/types/notification-settings.types";

export const notificationSettingsMapper = {
  fromResponse: (raw: NotificationSettings): NotificationSettings => ({
    ...raw,
    quietHoursStart: raw.quietHoursStart ?? null,
    quietHoursEnd: raw.quietHoursEnd ?? null,
    types: raw.types.map(notificationSettingsMapper.type)
  }),
  type: (raw: NotificationType): NotificationType => ({ ...raw }),
  toRequest: (raw: UpdateNotificationSettingsInput): UpdateNotificationSettingsInput => ({
    ...raw,
    quietHoursStart: raw.quietHoursStart ?? null,
    quietHoursEnd: raw.quietHoursEnd ?? null
  })
};
