import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

export type EnsurePushTokenResult = {
  status: PushPermissionStatus;
  token: string | null;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#3B82F6"
  });
}

function mapStatus(status: Notifications.PermissionStatus): PushPermissionStatus {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return mapStatus(status);
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return "granted";
  const next = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true
    }
  });
  return mapStatus(next.status);
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
  if (!projectId) return null;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data ?? null;
  } catch {
    return null;
  }
}

export async function ensurePushToken(): Promise<EnsurePushTokenResult> {
  const status = await requestPushPermission();
  if (status !== "granted") return { status, token: null };
  const token = await getExpoPushToken();
  return { status, token };
}
