import { useMutation, useQueryClient } from "@tanstack/react-query";
import { privacyApi } from "@/features/privacy/api/privacy.api";
import { updatePrivacySettingsSchema, UpdatePrivacySettingsInput } from "@/features/privacy/schemas/privacy.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePrivacySettingsInput) => {
      const parsed = updatePrivacySettingsSchema.parse(input);
      return privacyApi.updateSettings(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.PrivacySettings });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.AIInsights });
    }
  });
}
