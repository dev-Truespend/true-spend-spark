import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/features/profile/api/profile.api";
import { toProfile } from "@/features/profile/mappers/profile.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useProfile() {
  return useQuery({
    queryKey: QueryKeys.Profile,
    queryFn: async () => toProfile((await profileApi.get()).data),
    staleTime: 60_000
  });
}
