import { getLocationPermission } from "@/shared/native/location";
import { getCameraPermissionState } from "@/shared/native/camera";
import { getPushPermissionStatus } from "@/shared/native/pushNotifications";
import { permissionsApi } from "@/features/permissions/api/permissions.api";
import { PermissionState } from "@/shared/types/permissionState.types";

function pushStatusToState(status: "granted" | "denied" | "undetermined"): PermissionState {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "not_determined";
}

// Reads current OS-level permission state for location, camera, and
// notifications and reports them to the server. Used on cold start and on app
// foreground so server-side cache cannot drift if the user toggles permissions
// in system settings while the app is backgrounded. See workflow 12 §50.
export async function reportDevicePermissions(): Promise<void> {
  try {
    const [location, cameraState, pushStatus] = await Promise.all([
      getLocationPermission().catch(() => null),
      getCameraPermissionState().catch(() => null),
      getPushPermissionStatus().catch(() => null)
    ]);
    if (!location && !cameraState && !pushStatus) return;
    await permissionsApi.update({
      locationState: location?.state,
      cameraState: cameraState ?? undefined,
      notificationsState: pushStatus ? pushStatusToState(pushStatus) : undefined
    });
  } catch {
    // Best-effort sync — never block the app on a failed permission report.
  }
}
