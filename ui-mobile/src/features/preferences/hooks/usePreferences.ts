import { useQuery } from "@tanstack/react-query";
import { preferencesApi } from "@/features/preferences/api/preferences.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function usePreferences() {
  return useQuery({
    queryKey: QueryKeys.Preferences,
    queryFn: async () => (await preferencesApi.get()).data,
    staleTime: 60_000
  });
}
