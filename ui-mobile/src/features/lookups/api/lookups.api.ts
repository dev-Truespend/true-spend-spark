import { apiGet } from "@/shared/api/client";
import { CurrenciesResponse, PermissionStatesResponse } from "@/features/lookups/types/lookups.types";

export const lookupsApi = {
  currencies: () => apiGet<CurrenciesResponse>("/api/v1/lookups/currencies"),
  permissionStates: () => apiGet<PermissionStatesResponse>("/api/v1/lookups/permission-states")
};
