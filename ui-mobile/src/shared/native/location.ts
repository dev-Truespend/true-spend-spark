import * as Location from "expo-location";
import { PermissionState } from "@/shared/types/permissionState.types";

export type LocationScope = "foreground" | "background";

export type LocationPermissionResult = {
  state: PermissionState;
  canAskAgain: boolean;
};

export async function getLocationPermission(): Promise<LocationPermissionResult> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    return { state: mapForeground(foreground), canAskAgain: foreground.canAskAgain };
  }
  const background = await Location.getBackgroundPermissionsAsync();
  return { state: mapBackground(background, foreground), canAskAgain: background.canAskAgain };
}

export async function requestLocationPermission(scope: LocationScope): Promise<LocationPermissionResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (scope === "foreground" || foreground.status !== "granted") {
    return { state: mapForeground(foreground), canAskAgain: foreground.canAskAgain };
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  return { state: mapBackground(background, foreground), canAskAgain: background.canAskAgain };
}

function mapForeground(result: Location.LocationPermissionResponse): PermissionState {
  if (result.status === "granted") return "authorized_when_in_use";
  if (result.status === "denied") return result.canAskAgain ? "not_determined" : "denied";
  if (result.status === "undetermined") return "not_determined";
  return "unknown";
}

function mapBackground(
  background: Location.LocationPermissionResponse,
  foreground: Location.LocationPermissionResponse
): PermissionState {
  if (background.status === "granted") return "authorized_always";
  if (foreground.status === "granted") return "authorized_when_in_use";
  return mapForeground(foreground);
}

export type CurrentCoords = { lat: number; lng: number; accuracyMeters: number | null };

export async function getCurrentCoords(): Promise<CurrentCoords | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  let granted = permission.status === "granted";
  if (!granted && permission.canAskAgain) {
    const requested = await Location.requestForegroundPermissionsAsync();
    granted = requested.status === "granted";
  }
  if (!granted) return null;

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracyMeters: position.coords.accuracy ?? null
    };
  } catch {
    return null;
  }
}
