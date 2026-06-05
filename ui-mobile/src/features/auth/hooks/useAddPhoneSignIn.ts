import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { requestPhoneOtp } from "@/features/auth/api/auth.api";

export const addPhoneSignInSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(4, "Enter a valid phone number with country code.")
    .max(32, "Phone must be 32 characters or fewer.")
});

export type AddPhoneSignInForm = z.infer<typeof addPhoneSignInSchema>;

export function useAddPhoneSignIn() {
  return useMutation({
    mutationFn: async (input: AddPhoneSignInForm) => {
      const parsed = addPhoneSignInSchema.parse(input);
      await requestPhoneOtp(parsed.phone);
      return parsed.phone;
    }
  });
}
