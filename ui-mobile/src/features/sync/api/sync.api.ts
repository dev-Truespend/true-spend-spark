import { apiGet, apiPost } from "@/shared/api/client";
import { SyncStatusResponse } from "@/features/sync/types/sync.types";

export const syncApi = {
  getStatus: () => apiGet<SyncStatusResponse>("/api/v1/sync/status"),
  retry: () => apiPost<SyncStatusResponse>("/api/v1/sync/retry")
};
