// Shared stop-detection math for the `custom` arrival detector (10a). Used by both the foreground
// client (customArrivalClient) and the headless background task (backgroundArrivalTask) so the two
// paths agree on what counts as a stop and produce the SAME stable per-stop event id — the server
// dedups on (provider, eventId), so foreground + background never double-notify the same arrival.

export const STOP_RADIUS_METERS = 30; // within this of the anchor counts as "still"
export const ARRIVAL_DWELL_MS = 60_000; // must dwell this long before we call it an arrival
export const STOP_BUCKET_MS = 5 * 60_000; // arrival-time bucket for the stable per-stop event id

export type StopAnchor = { lat: number; lng: number; sinceMs: number; fired: boolean };

// Stable per-stop key: custom:{user}:{timeBucket}:{roundedLatLng}. Retries within the same stop reuse
// it so the server dedups on (provider, eventId).
export function stableStopId(userId: string, lat: number, lng: number, nowMs: number): string {
  const bucket = Math.floor(nowMs / STOP_BUCKET_MS);
  return `custom:${userId}:${bucket}:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export function classifyMovement(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || speed < 0) return "unknown";
  if (speed < 0.5) return "still";
  if (speed < 2.5) return "on_foot";
  return "in_vehicle";
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
