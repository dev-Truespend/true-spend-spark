export type SyncEventSeverity = "info" | "success" | "warn" | "error";

export type SyncEvent = {
  type: string;
  severity: SyncEventSeverity;
  message: string;
  occurredAt: string;
  action?: { code: string; label: string } | null;
};

export type SyncCachedEntityCount = {
  entityType: string;
  count: number;
};

export type SyncStatusResponse = {
  online: boolean;
  lastSyncAt?: string | null;
  pendingCount: number;
  cachedCounts: SyncCachedEntityCount[];
  recentEvents: SyncEvent[];
};
