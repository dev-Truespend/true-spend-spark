import { PermissionsResponse, UpdatePermissionsInput } from "@/features/permissions/types/permissions.types";

export const permissionsMapper = {
  fromResponse: (raw: PermissionsResponse): PermissionsResponse => ({
    ...raw,
    deviceId: raw.deviceId ?? null
  }),
  toRequest: (raw: UpdatePermissionsInput): UpdatePermissionsInput => ({
    deviceId: raw.deviceId ?? null,
    platformCode: raw.platformCode,
    location: raw.location ?? null,
    camera: raw.camera ?? null,
    notifications: raw.notifications ?? null,
    rawPlatformPayload: raw.rawPlatformPayload ?? null
  })
};
