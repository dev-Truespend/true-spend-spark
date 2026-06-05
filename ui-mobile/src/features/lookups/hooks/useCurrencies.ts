import { useQuery } from "@tanstack/react-query";
import { lookupsApi } from "@/features/lookups/api/lookups.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCurrencies() {
  return useQuery({
    queryKey: QueryKeys.LookupsCurrencies,
    queryFn: async () => (await lookupsApi.currencies()).data.currencies,
    staleTime: 24 * 60 * 60 * 1000
  });
}
