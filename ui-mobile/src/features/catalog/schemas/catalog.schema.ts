import { z } from "zod";

export const createCardProductRequestSchema = z.object({
  issuerName: z.string().trim().min(1).max(120),
  cardName: z.string().trim().min(1).max(120),
  createUserCard: z.boolean(),
  nickname: z.string().trim().max(60).optional(),
  lastFour: z.string().trim().regex(/^\d{4}$/u).optional(),
  isPrimary: z.boolean()
});
export type CreateCardProductRequestInput = z.infer<typeof createCardProductRequestSchema>;
