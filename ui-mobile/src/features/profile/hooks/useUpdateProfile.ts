import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "@/features/profile/api/profile.api";
import { toProfile } from "@/features/profile/mappers/profile.mapper";
import { updateProfileSchema, UpdateProfileForm } from "@/features/profile/schemas/profile.schema";
import { UpdateProfileRequest } from "@/features/profile/types/profile.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileForm) => {
      const parsed = updateProfileSchema.parse(input);
      const request: UpdateProfileRequest = {
        displayName: parsed.displayName,
        phone: emptyToNull(parsed.phone),
        countryCode: emptyToUpperOrNull(parsed.countryCode),
        currencyCode: emptyToUpperOrNull(parsed.currencyCode)
      };
      const response = await profileApi.update(request);
      return toProfile(response.data);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(QueryKeys.Profile, profile);
      void queryClient.invalidateQueries({ queryKey: QueryKeys.AuthBootstrap });
    }
  });
}

function emptyToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value.trim().length === 0 ? null : value.trim();
}

function emptyToUpperOrNull(value: string | undefined): string | null | undefined {
  const trimmed = emptyToNull(value);
  return typeof trimmed === "string" ? trimmed.toUpperCase() : trimmed;
}
