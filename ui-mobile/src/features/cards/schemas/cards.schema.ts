import { z } from "zod";

export const cardIdSchema = z.number().int().positive();

// Optional elsewhere (e.g. edit), but manual creation requires it so a later Plaid link
// can confidently match and adopt the card.
export const lastFourSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Last four must be exactly 4 digits")
  .optional()
  .or(z.literal(""));

export const requiredLastFourSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Last four must be exactly 4 digits");

export const createManualCardSchema = z.object({
  cardProductId: z.number().int().positive(),
  issuerId: z.number().int().positive(),
  nickname: z.string().trim().max(40).optional(),
  lastFour: requiredLastFourSchema,
  isPrimary: z.boolean().default(false)
});
export type CreateManualCardInput = z.infer<typeof createManualCardSchema>;

export const upsertRewardOverrideSchema = z.object({
  categoryCode: z.string().trim().min(1, "Category code is required").max(64),
  multiplier: z.number().positive("Multiplier must be greater than zero"),
  notes: z.string().trim().max(200).optional()
});
export type UpsertRewardOverrideInput = z.infer<typeof upsertRewardOverrideSchema>;

export const deleteRewardOverrideSchema = z.object({
  categoryCode: z.string().trim().min(1, "Category code is required").max(64)
});
export type DeleteRewardOverrideInput = z.infer<typeof deleteRewardOverrideSchema>;

export const createCardProductRequestSchema = z
  .object({
    issuerName: z.string().trim().min(1).max(80),
    cardName: z.string().trim().min(1).max(120),
    createUserCard: z.boolean().default(false),
    nickname: z.string().trim().max(40).optional(),
    lastFour: lastFourSchema,
    isPrimary: z.boolean().default(false)
  })
  .superRefine((value, ctx) => {
    // Last four is required only when this request also creates a manual card.
    if (value.createUserCard && !/^\d{4}$/.test((value.lastFour ?? "").trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lastFour"], message: "Last four must be exactly 4 digits" });
    }
  });
export type CreateCardProductRequestInput = z.infer<typeof createCardProductRequestSchema>;
