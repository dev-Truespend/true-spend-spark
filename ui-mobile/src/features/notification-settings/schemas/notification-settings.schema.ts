import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM").optional();

export const updateNotificationSettingsSchema = z.object({
  masterEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: hhmm.or(z.literal("")).optional(),
  quietHoursEnd: hhmm.or(z.literal("")).optional()
});
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;

export const updateNotificationTypePreferenceSchema = z.object({
  typeCode: z.string().trim().min(1, "Type code is required"),
  enabled: z.boolean()
});
export type UpdateNotificationTypePreferenceInput = z.infer<typeof updateNotificationTypePreferenceSchema>;
