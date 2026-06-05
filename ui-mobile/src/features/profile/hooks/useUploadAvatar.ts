import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "@/features/profile/api/profile.api";
import { toProfile } from "@/features/profile/mappers/profile.mapper";
import { avatarUploadSchema, AvatarUploadForm } from "@/features/profile/schemas/profile.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AvatarUploadForm) => {
      const parsed = avatarUploadSchema.parse(input);
      const response = await profileApi.uploadAvatar(parsed);
      return toProfile(response.data);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(QueryKeys.Profile, profile);
      void queryClient.invalidateQueries({ queryKey: QueryKeys.AuthBootstrap });
    }
  });
}
