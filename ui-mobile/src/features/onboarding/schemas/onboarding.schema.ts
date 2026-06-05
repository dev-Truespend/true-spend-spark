import { z } from "zod";

export const updateOnboardingSchema = z.object({
  currentStepCode: z.string().trim().min(1).optional(),
  cardConnectionPlaid: z.boolean().optional(),
  cardConnectionManual: z.boolean().optional(),
  cardConnectionSkipped: z.boolean().optional()
});
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;
