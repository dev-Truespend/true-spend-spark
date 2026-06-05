import { Transaction } from "@/features/transactions/types/transactions.types";
import { MissedReward } from "@/features/transactions/types/transactions.types";

export type Notification = {
  id: number;
  typeCode: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedTransactionId?: number | null;
  relatedMissedRewardEventId?: number | null;
};

export type NotificationDetail = {
  notification: Notification;
  relatedTransaction?: Transaction | null;
  relatedMissedReward?: MissedReward | null;
};

export type NotificationReminder = {
  id: number;
  sourceNotificationId?: number | null;
  remindAt: string;
  title: string;
  body: string;
  isFired: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: Notification[];
};

export type NotificationDetailResponse = {
  notification: Notification;
  relatedTransaction?: Transaction | null;
  relatedMissedReward?: MissedReward | null;
};

export type NotificationRemindersResponse = {
  reminders: NotificationReminder[];
};

export type CreateNotificationReminderInput = {
  sourceNotificationId?: number | null;
  remindAt: string;
  title: string;
  body: string;
};
