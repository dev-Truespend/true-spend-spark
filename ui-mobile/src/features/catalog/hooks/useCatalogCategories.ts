import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/features/catalog/api/catalog.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCatalogCategories() {
  return useQuery({
    queryKey: QueryKeys.CatalogCategories,
    queryFn: catalogApi.getCategories,
    staleTime: 1000 * 60 * 60
  });
}
