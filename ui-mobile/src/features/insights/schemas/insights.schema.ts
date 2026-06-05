import { z } from "zod";

export const dismissInsightSchema = z.object({
  insightId: z.number().int().positive()
});

export type DismissInsightSchema = z.infer<typeof dismissInsightSchema>;
