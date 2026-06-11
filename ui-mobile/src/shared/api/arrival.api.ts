import { apiPost } from "@/shared/api/client";

// Custom-path arrival ingress (10a). Carries NO user identity — the server derives userId from the
// JWT. eventId is a stable per-stop key so background retries dedup instead of re-notifying.
export type GeoArrivalRequest = {
  eventId: string;
  eventType: string;
  placeName?: string | null;
  providerPlaceId?: string | null;
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
  occurredAt: string;
  matchConfidence?: number | null;
  dwellSeconds?: number | null;
  movementState?: string | null;
};

export type GeoArrivalAck = {
  received: boolean;
  deduplicated: boolean;
};

export const arrivalApi = {
  reportArrival: (input: GeoArrivalRequest) => apiPost<GeoArrivalAck>("/api/v1/geo/arrival", input)
};
