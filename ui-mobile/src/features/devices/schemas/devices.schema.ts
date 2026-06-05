import { z } from "zod";

export const registerDeviceSchema = z.object({
  pushToken: z.string().trim().max(200).nullable().optional()
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
