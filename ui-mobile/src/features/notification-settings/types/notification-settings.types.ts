export type NotificationType = {
  code: string;
  displayName: string;
  enabled: boolean;
};

export type NotificationSettings = {
  masterEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  types: NotificationType[];
};

export type UpdateNotificationSettingsInput = {
  masterEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
};
