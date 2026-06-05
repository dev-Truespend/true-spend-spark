import { Notification, NotificationDetail, NotificationReminder } from "@/features/notifications/types/notifications.types";

export const notificationsMapper = {
  notification: (raw: Notification): Notification => ({ ...raw }),
  detail: (raw: NotificationDetail): NotificationDetail => ({ ...raw }),
  reminder: (raw: NotificationReminder): NotificationReminder => ({ ...raw })
};
