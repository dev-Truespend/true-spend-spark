import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/features/catalog/api/catalog.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCatalogProducts(issuerId?: number) {
  return useQuery({
    queryKey: [...QueryKeys.CatalogProducts, issuerId ?? null],
    queryFn: () => catalogApi.getProducts(issuerId),
    enabled: issuerId === undefined || Number.isFinite(issuerId),
    staleTime: 1000 * 60 * 10
  });
}

export function useCatalogProductSearch(q: string, issuerId?: number) {
  return useQuery({
    queryKey: [...QueryKeys.CatalogProducts, "search", q, issuerId ?? null],
    queryFn: () => catalogApi.searchProducts(q, issuerId),
    enabled: q.trim().length > 1,
    staleTime: 1000 * 30
  });
}
