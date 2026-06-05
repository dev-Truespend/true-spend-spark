// Device registration is cross-cutting infrastructure (auth, notifications,
// onboarding all touch it) and lives in shared/. Keep this file as a forwarder
// so the existing feature exports remain stable.
export { devicesApi } from "@/shared/api/devices.api";
export type { DeviceRegistrationInput, DeleteDeviceResponse } from "@/shared/api/devices.api";
