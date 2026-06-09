import * as ImagePicker from "expo-image-picker";
import { PermissionState } from "@/shared/types/permissionState.types";

export async function getCameraPermissionState(): Promise<PermissionState> {
  const result = await ImagePicker.getCameraPermissionsAsync();
  if (result.granted) return "granted";
  if (result.status === "denied") return result.canAskAgain ? "not_determined" : "denied";
  return "not_determined";
}
