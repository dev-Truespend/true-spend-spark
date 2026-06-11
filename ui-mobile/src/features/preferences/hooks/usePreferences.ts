import { useQuery } from "@tanstack/react-query";
import { preferencesApi } from "@/features/preferences/api/preferences.api";
import { useAuth } from "@/providers/AuthProvider";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function usePreferences() {
  // Preferences require an authenticated session. Gating on the session keeps
  // this from firing (and 401-ing) on a signed-out cold start.
  const { session } = useAuth();
  return useQuery({
    queryKey: QueryKeys.Preferences,
    queryFn: async () => (await preferencesApi.get()).data,
    staleTime: 60_000,
    enabled: !!session
  });
}
