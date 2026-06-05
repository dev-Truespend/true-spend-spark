import { apiGet, apiPost } from "@/shared/api/client";
import { CardProduct, Category, CreateCardProductRequestInput, Issuer } from "@/features/catalog/types/catalog.types";

export const catalogApi = {
  getIssuers: () => apiGet<{ issuers: Issuer[] }>("/api/v1/card-catalog/issuers"),
  getProducts: (issuerId?: number) =>
    apiGet<{ products: CardProduct[] }>("/api/v1/card-catalog/products", issuerId ? { issuerId } : undefined),
  searchProducts: (q: string, issuerId?: number) =>
    apiGet<{ products: CardProduct[] }>("/api/v1/card-catalog/search", issuerId ? { q, issuerId } : { q }),
  getCategories: () => apiGet<{ categories: Category[] }>("/api/v1/card-catalog/categories"),
  createRequest: (body: CreateCardProductRequestInput) =>
    apiPost<{ request: unknown; userCard?: unknown }>("/api/v1/card-catalog/requests", body)
};
