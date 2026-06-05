import { z } from "zod";

export const periodCodeSchema = z.enum(["monthly", "annual"]);
export type PeriodCode = z.infer<typeof periodCodeSchema>;

export const returnContextCodeSchema = z.enum(["onboarding", "billing"]);
export type ReturnContextCode = z.infer<typeof returnContextCodeSchema>;

export const planCodeSchema = z.string().trim().min(1).max(40);

export const createCheckoutSchema = z.object({
  planCode: planCodeSchema,
  periodCode: periodCodeSchema,
  returnContextCode: returnContextCodeSchema.default("billing")
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
