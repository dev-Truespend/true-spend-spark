import { z } from "zod";

export const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  locale: z.string().trim().max(16, "Locale must be 16 characters or fewer.").optional(),
  timezone: z.string().trim().max(64, "Timezone must be 64 characters or fewer.").optional(),
  hideAmounts: z.boolean().optional(),
  biometricUnlockEnabled: z.boolean().optional()
});

export type UpdatePreferencesForm = z.infer<typeof updatePreferencesSchema>;
