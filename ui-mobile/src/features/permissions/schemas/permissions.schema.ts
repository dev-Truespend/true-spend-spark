import { z } from "zod";

export const permissionStateSchema = z.enum([
  "unknown",
  "not_determined",
  "denied",
  "restricted",
  "limited",
  "provisional",
  "granted",
  "authorized",
  "authorized_when_in_use",
  "authorized_always",
  "authorized_once"
]);
export type PermissionStateInput = z.infer<typeof permissionStateSchema>;

export const updatePermissionsSchema = z.object({
  deviceId: z.number().int().positive().optional(),
  locationState: permissionStateSchema.optional(),
  notificationsState: permissionStateSchema.optional(),
  cameraState: permissionStateSchema.optional()
});
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;
