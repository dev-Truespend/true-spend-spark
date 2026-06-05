import { PermissionState } from "@/shared/types/permissionState.types";

const labels: Record<PermissionState, string> = {
  unknown: "Unknown",
  not_determined: "Not asked",
  denied: "Denied",
  restricted: "Restricted",
  limited: "Limited",
  provisional: "Provisional",
  granted: "Allowed",
  authorized: "Allowed",
  authorized_when_in_use: "While in use",
  authorized_always: "Always",
  authorized_once: "This time only"
};

const grantedStates = new Set<PermissionState>([
  "granted",
  "authorized",
  "authorized_when_in_use",
  "authorized_always",
  "authorized_once",
  "limited",
  "provisional"
]);

const blockedStates = new Set<PermissionState>(["denied", "restricted"]);

export function permissionLabel(state: PermissionState): string {
  return labels[state] ?? "Unknown";
}

export function permissionTone(state: PermissionState): "default" | "warning" | "danger" {
  if (grantedStates.has(state)) return "default";
  if (blockedStates.has(state)) return "danger";
  return "warning";
}
