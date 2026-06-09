import { z } from "zod";

export const updateRecommendationCategorySchema = z.object({
  recommendationId: z.number().int().positive(),
  categoryCode: z.string().trim().min(1)
});
export type UpdateRecommendationCategoryInput = z.infer<typeof updateRecommendationCategorySchema>;

export const refreshRecommendationSchema = z.object({
  merchantId: z.number().int().positive(),
  categoryCode: z.string().trim().min(1).optional()
});
export type RefreshRecommendationInput = z.infer<typeof refreshRecommendationSchema>;

export const createMerchantVisitSchema = z.object({
  merchantId: z.number().int().positive(),
  selectedCategoryCode: z.string().trim().min(1).optional(),
  visitedAt: z.string().datetime().optional()
});
export type CreateMerchantVisitInput = z.infer<typeof createMerchantVisitSchema>;
