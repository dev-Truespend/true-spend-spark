import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiPost } from "@/shared/api/client";

export type DeviceRegistrationInput = {
  pushToken?: string | null;
};

export type DeleteDeviceResponse = {
  deviceId: number;
  isActive: boolean;
};

// Device registration is cross-cutting infrastructure (auth + notifications +
// onboarding all touch it), so it lives in shared/ rather than under a feature.
export const devicesApi = {
  register: (input: DeviceRegistrationInput = {}) =>
    apiPost<{ deviceId?: number | null; registered: boolean }>("/api/v1/devices", {
      platformCode: Platform.OS === "android" ? "android" : "ios",
      pushToken: input.pushToken ?? null,
      appVersion: Constants.expoConfig?.version ?? null,
      osVersion: String(Platform.Version),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }),
  delete: (deviceId: number) =>
    apiPost<DeleteDeviceResponse>("/api/v1/devices/delete", { deviceId })
};
