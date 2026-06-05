import { apiGet, apiPost } from "@/shared/api/client";
import { PreferencesResponse, UpdatePreferencesRequest } from "@/features/preferences/types/preferences.types";

export const preferencesApi = {
  get: () => apiGet<PreferencesResponse>("/api/v1/preferences"),
  update: (request: UpdatePreferencesRequest) => apiPost<PreferencesResponse>("/api/v1/preferences", request)
};
