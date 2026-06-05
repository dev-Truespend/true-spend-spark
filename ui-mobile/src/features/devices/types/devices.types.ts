export type RegisterDeviceInput = {
  platformCode: "ios" | "android";
  pushToken?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
};

export type DeviceResponse = {
  deviceId: number;
  registered: boolean;
};
