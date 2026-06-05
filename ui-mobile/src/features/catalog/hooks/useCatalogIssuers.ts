import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/features/catalog/api/catalog.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCatalogIssuers() {
  return useQuery({
    queryKey: QueryKeys.CatalogIssuers,
    queryFn: catalogApi.getIssuers,
    staleTime: 1000 * 60 * 60
  });
}
