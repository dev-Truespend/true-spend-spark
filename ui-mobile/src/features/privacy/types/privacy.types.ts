export type PrivacySettings = {
  anonymousAnalyticsEnabled: boolean;
  personalizedAIInsightsEnabled: boolean;
  locationHistoryEnabled: boolean;
  dataSharingForImprovementEnabled: boolean;
};

export type UpdatePrivacySettingsRequest = Partial<PrivacySettings>;

export type DataExportFormat = "csv" | "json";

export type RequestDataExportRequest = { format: DataExportFormat };

export type DataExportStatus = "pending" | "ready" | "failed" | "expired";

export type DataExportStatusResponse = {
  requestId: string;
  status: DataExportStatus;
  exportUrl?: string | null;
  expiresAt?: string | null;
};

export type LocationHistoryResponse = { downloadUrl: string; expiresAt?: string | null };

export type ClearLocationHistoryRequest = { deleteBefore?: string };

export type LocationHistoryClearStatus = "pending" | "completed" | "failed";

export type LocationHistoryClearStatusResponse = {
  requestId: string;
  status: LocationHistoryClearStatus;
  deletedEventCount: number;
};

export type AccountDeletionState = "none" | "pending" | "cancelled" | "purging" | "purged";

export type AccountDeletionStatusResponse = {
  status: AccountDeletionState;
  requestedAt?: string | null;
  purgeAfter?: string | null;
};
