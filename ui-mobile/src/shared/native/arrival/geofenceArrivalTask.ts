import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { postGeoEvent, readBackgroundSession } from "@/shared/native/arrival/arrivalReporting";
import { stableStopId } from "@/shared/native/arrival/arrivalStopMath";

// Native OS geofences around the user's frequent/relevant places (10a, item 8). The OS wakes the app on
// region enter/exit even when killed, far cheaper than continuous location — so this is the battery-/
// reliability-optimized path for KNOWN places. Continuous stop-detection (backgroundArrivalTask) stays the
// always-on fallback for everywhere else. Enter -> arrival, Exit -> exit (closes the area session, item 8).
//
// iOS monitors at most 20 regions and Android ~100, so the server caps the region list it returns.
// Best-effort, like all background detection — Doze/OEM throttling still applies on Android.

export const ARRIVAL_GEOFENCE_TASK = "truespend-arrival-geofence";

type GeofenceTaskData = { eventType?: Location.GeofencingEventType; region?: Location.LocationRegion };

TaskManager.defineTask(ARRIVAL_GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const { eventType, region } = (data ?? {}) as GeofenceTaskData;
  if (!region || typeof region.latitude !== "number" || typeof region.longitude !== "number") return;

  const session = await readBackgroundSession();
  if (session === null) return;

  const nowMs = Date.now();
  const isExit = eventType === Location.GeofencingEventType.Exit;
  const stopId = stableStopId(session.userId, region.latitude, region.longitude, nowMs);

  await postGeoEvent(session.accessToken, {
    // Enter shares the per-stop id shape so a geofence enter and a continuous-tracking stop at the same
    // place/time bucket dedup server-side; exit gets an ":exit" suffix so it never collides with arrival.
    eventId: isExit ? `${stopId}:exit` : stopId,
    eventType: isExit ? "exit" : "arrival",
    lat: region.latitude,
    lng: region.longitude,
    // region.radius is the GEOFENCE SIZE (~100m+), NOT a GPS accuracy reading — sending it as
    // accuracyMeters would trip the server's coarse-fix gate (>75m => Low tier => no push) and defeat the
    // whole point of native geofences. The region center IS a known place, so we report null accuracy:
    // the server place-matches on geometry (center sits on the merchant => clear single hit => push).
    accuracyMeters: null,
    occurredAt: new Date(nowMs).toISOString(),
    dwellSeconds: null,
    movementState: "unknown"
  });
});

export type ArrivalGeofenceRegion = { identifier: string; lat: number; lng: number; radiusMeters: number };

// Replaces the monitored region set. Passing an empty list stops geofencing entirely.
export async function registerArrivalGeofences(regions: ArrivalGeofenceRegion[]): Promise<void> {
  if (regions.length === 0) {
    await stopArrivalGeofences();
    return;
  }
  const mapped: Location.LocationRegion[] = regions.map((r) => ({
    identifier: r.identifier,
    latitude: r.lat,
    longitude: r.lng,
    radius: r.radiusMeters,
    notifyOnEnter: true,
    notifyOnExit: true
  }));
  await Location.startGeofencingAsync(ARRIVAL_GEOFENCE_TASK, mapped);
}

export async function stopArrivalGeofences(): Promise<void> {
  try {
    if (await Location.hasStartedGeofencingAsync(ARRIVAL_GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(ARRIVAL_GEOFENCE_TASK);
    }
  } catch {
    // Best-effort — nothing to stop, or the platform rejected it.
  }
}
