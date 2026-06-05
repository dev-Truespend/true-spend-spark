import { z } from "zod";

export const cardIdSchema = z.number().int().positive();

export const lastFourSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Last four must be exactly 4 digits")
  .optional()
  .or(z.literal(""));

export const createManualCardSchema = z.object({
  cardProductId: z.number().int().positive(),
  issuerId: z.number().int().positive(),
  nickname: z.string().trim().max(40).optional(),
  lastFour: lastFourSchema,
  isPrimary: z.boolean().default(false)
});
export type CreateManualCardInput = z.infer<typeof createManualCardSchema>;

export const upsertRewardOverrideSchema = z.object({
  categoryCode: z.string().min(1, "Category is required"),
  multiplier: z.number().positive("Multiplier must be greater than zero"),
  notes: z.string().trim().max(200).optional()
});
export type UpsertRewardOverrideInput = z.infer<typeof upsertRewardOverrideSchema>;

export const deleteRewardOverrideSchema = z.object({
  categoryCode: z.string().min(1, "Category is required")
});
export type DeleteRewardOverrideInput = z.infer<typeof deleteRewardOverrideSchema>;

export const createCardProductRequestSchema = z.object({
  issuerName: z.string().trim().min(1).max(80),
  cardName: z.string().trim().min(1).max(120),
  createUserCard: z.boolean().default(false),
  nickname: z.string().trim().max(40).optional(),
  lastFour: lastFourSchema,
  isPrimary: z.boolean().default(false)
});
export type CreateCardProductRequestInput = z.infer<typeof createCardProductRequestSchema>;
