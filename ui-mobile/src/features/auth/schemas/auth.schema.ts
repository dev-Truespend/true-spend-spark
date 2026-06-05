import { z } from "zod";

export const OtpTargetSchema = z.object({
  value: z.string().min(3),
  channel: z.enum(["email", "phone"])
});

export const OtpVerifySchema = z.object({
  value: z.string().min(3),
  token: z.string().min(4),
  channel: z.enum(["email", "phone"])
});
