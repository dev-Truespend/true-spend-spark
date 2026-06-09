import { z } from "zod";

export const createCardProductRequestSchema = z
  .object({
    issuerName: z.string().trim().min(1).max(120),
    cardName: z.string().trim().min(1).max(120),
    createUserCard: z.boolean(),
    nickname: z.string().trim().max(60).optional(),
    lastFour: z.string().trim().regex(/^\d{4}$/u).optional(),
    isPrimary: z.boolean()
  })
  .superRefine((value, ctx) => {
    // Last four is required when the request also creates a manual card (Plaid-adoption match key).
    if (value.createUserCard && !/^\d{4}$/u.test((value.lastFour ?? "").trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lastFour"], message: "Last four must be exactly 4 digits" });
    }
  });
export type CreateCardProductRequestInput = z.infer<typeof createCardProductRequestSchema>;
