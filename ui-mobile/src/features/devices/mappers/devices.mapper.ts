import { DeviceResponse, RegisterDeviceInput } from "@/features/devices/types/devices.types";

export const devicesMapper = {
  toRequest: (raw: RegisterDeviceInput): RegisterDeviceInput => ({
    platformCode: raw.platformCode,
    pushToken: raw.pushToken ?? null,
    deviceName: raw.deviceName ?? null,
    appVersion: raw.appVersion ?? null,
    osVersion: raw.osVersion ?? null
  }),
  fromResponse: (raw: DeviceResponse): DeviceResponse => ({ ...raw })
};
