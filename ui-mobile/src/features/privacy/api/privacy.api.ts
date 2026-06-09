import { apiGet, apiPost } from "@/shared/api/client";
import {
  AccountDeletionStatusResponse,
  ClearLocationHistoryRequest,
  DataExportStatusResponse,
  LocationHistoryClearStatusResponse,
  LocationHistoryResponse,
  PrivacySettings,
  RequestDataExportRequest,
  UpdatePrivacySettingsRequest
} from "@/features/privacy/types/privacy.types";

export const privacyApi = {
  getSettings: () => apiGet<PrivacySettings>("/api/v1/privacy-settings"),
  updateSettings: (body: UpdatePrivacySettingsRequest) =>
    apiPost<PrivacySettings>("/api/v1/privacy-settings", body),
  requestExport: (body: RequestDataExportRequest) =>
    apiPost<DataExportStatusResponse>("/api/v1/data-export", body),
  getExportStatus: (requestId: string) =>
    apiGet<DataExportStatusResponse>(`/api/v1/data-export/${requestId}`),
  downloadLocationHistory: () =>
    apiGet<LocationHistoryResponse>("/api/v1/location-history/download"),
  clearLocationHistory: (body: ClearLocationHistoryRequest) =>
    apiPost<LocationHistoryClearStatusResponse>("/api/v1/location-history/clear", body),
  getClearStatus: (requestId: string) =>
    apiGet<LocationHistoryClearStatusResponse>(`/api/v1/location-history/clear/${requestId}`),
  getDeletionStatus: () => apiGet<AccountDeletionStatusResponse>("/api/v1/account-deletion"),
  requestDeletion: () => apiPost<AccountDeletionStatusResponse>("/api/v1/account-deletion"),
  cancelDeletion: () => apiPost<AccountDeletionStatusResponse>("/api/v1/account-deletion/cancel")
};
