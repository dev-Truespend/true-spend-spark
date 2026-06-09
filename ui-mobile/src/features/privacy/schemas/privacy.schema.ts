import { z } from "zod";

export const updatePrivacySettingsSchema = z.object({
  anonymousAnalyticsEnabled: z.boolean().optional(),
  personalizedAIInsightsEnabled: z.boolean().optional(),
  locationHistoryEnabled: z.boolean().optional(),
  dataSharingForImprovementEnabled: z.boolean().optional()
}).refine((v) => Object.keys(v).length > 0, { message: "At least one toggle must change." });

export const requestDataExportSchema = z.object({
  format: z.enum(["csv", "json"])
});

export const clearLocationHistorySchema = z.object({
  // ISO-8601 date or date-time. If omitted, server clears all.
  deleteBefore: z.string().min(1).optional()
});

export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>;
export type RequestDataExportInput = z.infer<typeof requestDataExportSchema>;
export type ClearLocationHistoryInput = z.infer<typeof clearLocationHistorySchema>;
