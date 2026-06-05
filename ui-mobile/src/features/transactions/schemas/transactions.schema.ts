import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Enter a real calendar date")
  .refine((value) => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    return value <= todayIso;
  }, "Transaction date can't be in the future")
  .refine((value) => {
    // Reject anything more than 10 years in the past as a typo guard.
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 10);
    return value >= fiveYearsAgo.toISOString().slice(0, 10);
  }, "Transaction date looks too far in the past");

export const createTransactionSchema = z.object({
  merchantName: z.string().trim().min(1, "Merchant name is required").max(200),
  amount: z.number().positive("Amount must be greater than 0"),
  cardId: z.number().int().positive("Card is required"),
  categoryCode: z.string().trim().min(1, "Category is required"),
  transactionDate: isoDate,
  transactionTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  locationLabel: z.string().trim().max(200).optional().nullable(),
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable()
});
export type CreateTransactionFormInput = z.infer<typeof createTransactionSchema>;

export const transactionIdSchema = z.number().int().positive();
export const missedRewardIdSchema = z.number().int().positive();

export const updateTransactionSchema = z.object({
  merchantName: z.string().trim().min(1).max(200).optional().nullable(),
  amount: z.number().positive().optional().nullable(),
  cardId: z.number().int().positive().optional().nullable(),
  categoryCode: z.string().trim().min(1).optional().nullable(),
  transactionDate: isoDate.optional().nullable(),
  transactionTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  locationLabel: z.string().trim().max(200).optional().nullable(),
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable()
});
export type UpdateTransactionFormInput = z.infer<typeof updateTransactionSchema>;
