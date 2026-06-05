import { useMutation, useQueryClient } from "@tanstack/react-query";
import { preferencesApi } from "@/features/preferences/api/preferences.api";
import { updatePreferencesSchema, UpdatePreferencesForm } from "@/features/preferences/schemas/preferences.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePreferencesForm) => {
      const parsed = updatePreferencesSchema.parse(input);
      const response = await preferencesApi.update(parsed);
      return response.data;
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(QueryKeys.Preferences, preferences);
      void queryClient.invalidateQueries({ queryKey: QueryKeys.AuthBootstrap });
    }
  });
}
