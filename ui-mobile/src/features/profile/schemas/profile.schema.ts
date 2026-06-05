import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(100, "Display name must be 100 characters or fewer.")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(32, "Phone must be 32 characters or fewer.")
    .optional()
    .or(z.literal("")),
  countryCode: z
    .string()
    .trim()
    .length(2, "Country code must be a 2-letter ISO code.")
    .optional()
    .or(z.literal("")),
  currencyCode: z
    .string()
    .trim()
    .length(3, "Currency code must be a 3-letter ISO code.")
    .optional()
    .or(z.literal(""))
});

export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

const ALLOWED_AVATAR_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"] as const;

export const avatarUploadSchema = z.object({
  uri: z.string().min(1, "Avatar URI is required."),
  fileName: z.string().min(1, "Avatar file name is required.").max(120),
  mimeType: z
    .string()
    .refine((value) => ALLOWED_AVATAR_MIMES.includes(value.toLowerCase() as (typeof ALLOWED_AVATAR_MIMES)[number]), {
      message: "Avatar must be JPEG, PNG, WebP, or HEIC."
    })
});

export type AvatarUploadForm = z.infer<typeof avatarUploadSchema>;
