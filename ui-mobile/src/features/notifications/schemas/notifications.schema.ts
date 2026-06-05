import { z } from "zod";

export const notificationIdSchema = z.number().int().positive();
export const reminderIdSchema = z.number().int().positive();

export const createNotificationReminderSchema = z.object({
  sourceNotificationId: z.number().int().positive().optional().nullable(),
  remindAt: z.string().datetime({ offset: true }),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required")
});

export type CreateNotificationReminderSchema = z.infer<typeof createNotificationReminderSchema>;
