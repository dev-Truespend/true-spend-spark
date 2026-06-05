import { Platform } from "react-native";
import { apiGet, apiPost } from "@/shared/api/client";
import { PermissionsResponse, PermissionState } from "@/features/permissions/types/permissions.types";

export type { PermissionState } from "@/features/permissions/types/permissions.types";

export type PermissionsUpdateInput = {
  locationState?: PermissionState;
  cameraState?: PermissionState;
  notificationsState?: PermissionState;
  deviceId?: number | null;
};

export const permissionsApi = {
  get: () => apiGet<PermissionsResponse>("/api/v1/permissions"),
  update: (input: PermissionsUpdateInput) =>
    apiPost<PermissionsResponse>("/api/v1/permissions", {
      deviceId: input.deviceId,
      platformCode: Platform.OS === "android" ? "android" : "ios",
      location: input.locationState ? { state: input.locationState } : undefined,
      camera: input.cameraState ? { state: input.cameraState } : undefined,
      notifications: input.notificationsState ? { state: input.notificationsState } : undefined
    })
};
