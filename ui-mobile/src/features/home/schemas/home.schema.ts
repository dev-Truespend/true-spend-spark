import { z } from "zod";

export const resolveMerchantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  provider: z.enum(["mapkit", "google", "foursquare", "manual"]).optional(),
  providerPlaceId: z.string().trim().min(1).optional(),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
  address: z.string().trim().max(255).optional()
});
export type ResolveMerchantInput = z.infer<typeof resolveMerchantSchema>;

export const inStoreRecommendationSchema = z.object({
  merchantId: z.number().int().positive(),
  categoryCode: z.string().trim().min(1).optional(),
  estimatedAmount: z.number().nonnegative().optional()
});
export type InStoreRecommendationInput = z.infer<typeof inStoreRecommendationSchema>;

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
