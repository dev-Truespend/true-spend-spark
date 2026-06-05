export type { PermissionState } from "@/shared/types/permissionState.types";
import type { PermissionState } from "@/shared/types/permissionState.types";

export type PermissionInput = {
  state: PermissionState;
  accuracy?: string | null;
};

export type UpdatePermissionsInput = {
  deviceId?: number | null;
  platformCode: "ios" | "android";
  location?: PermissionInput | null;
  camera?: PermissionInput | null;
  notifications?: PermissionInput | null;
  rawPlatformPayload?: Record<string, unknown> | null;
};

export type PermissionsResponse = {
  location: PermissionState;
  camera: PermissionState;
  notifications: PermissionState;
  deviceId?: number | null;
  lastReportedAt: string;
};
