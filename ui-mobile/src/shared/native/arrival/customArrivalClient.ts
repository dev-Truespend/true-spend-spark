import * as Location from "expo-location";
import { arrivalApi, GeoArrivalRequest } from "@/shared/api/arrival.api";
import { ArrivalDetectionClient } from "@/shared/native/arrival/arrivalDetectionClient";
import { ARRIVAL_LOCATION_TASK } from "@/shared/native/arrival/backgroundArrivalTask";
import { registerArrivalGeofences, stopArrivalGeofences } from "@/shared/native/arrival/geofenceArrivalTask";
import {
  ARRIVAL_DWELL_MS,
  StopAnchor,
  STOP_RADIUS_METERS,
  classifyMovement,
  haversineMeters,
  stableStopId
} from "@/shared/native/arrival/arrivalStopMath";

// Own-built `custom` arrival detector (10a). Battery rule: do nothing while moving; act only on a stop.
// Two complementary paths, both gated to fire at most once per physical stop (same stable eventId →
// server dedups):
//   - Foreground: watchPositionAsync while the app is alive (fast, immediate).
//   - Background/killed: Location.startLocationUpdatesAsync feeds backgroundArrivalTask via
//     expo-task-manager — iOS relaunches on significant-location-change, Android keeps the process
//     alive with a foreground-service notification. Background delivery is best-effort (iOS lag,
//     Android Doze/OEM throttling out of scope this cut).

export function createCustomArrivalClient(): ArrivalDetectionClient {
  let userId: string | null = null;
  let subscription: Location.LocationSubscription | null = null;
  let anchor: StopAnchor | null = null;

  async function onPosition(position: Location.LocationObject): Promise<void> {
    if (!userId) return;
    const { latitude, longitude, accuracy, speed } = position.coords;
    const nowMs = Date.now();

    if (anchor === null || haversineMeters(anchor.lat, anchor.lng, latitude, longitude) > STOP_RADIUS_METERS) {
      // Moving (or first fix): reset the anchor; nothing fires.
      anchor = { lat: latitude, lng: longitude, sinceMs: nowMs, fired: false };
      return;
    }

    // Still near the anchor — has the user dwelled long enough to be an arrival?
    if (anchor.fired || nowMs - anchor.sinceMs < ARRIVAL_DWELL_MS) return;
    anchor.fired = true;
    await reportArrival(userId, anchor, accuracy, speed, nowMs);
  }

  async function reportArrival(
    uid: string,
    stop: StopAnchor,
    accuracy: number | null | undefined,
    speed: number | null | undefined,
    nowMs: number
  ): Promise<void> {
    const request: GeoArrivalRequest = {
      eventId: stableStopId(uid, stop.lat, stop.lng, nowMs),
      eventType: "arrival",
      lat: stop.lat,
      lng: stop.lng,
      accuracyMeters: accuracy ?? null,
      occurredAt: new Date(nowMs).toISOString(),
      dwellSeconds: Math.round((nowMs - stop.sinceMs) / 1000),
      movementState: classifyMovement(speed)
    };
    try {
      await arrivalApi.reportArrival(request);
    } catch {
      // Best-effort: a dropped arrival just means no nudge this stop. Retries reuse the same eventId,
      // so the server dedups instead of double-notifying.
    }
  }

  async function startBackgroundUpdates(): Promise<void> {
    try {
      const background = await Location.getBackgroundPermissionsAsync();
      if (background.status !== "granted") return;
      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(ARRIVAL_LOCATION_TASK);
      if (alreadyRunning) return;
      await Location.startLocationUpdatesAsync(ARRIVAL_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        // Defer/batch updates so we only wake on meaningful movement, not continuously.
        deferredUpdatesInterval: 30_000,
        deferredUpdatesDistance: 25,
        pausesUpdatesAutomatically: true,
        activityType: Location.ActivityType.Other,
        showsBackgroundLocationIndicator: false,
        foregroundService: {
          notificationTitle: "TrueSpend",
          notificationBody: "Watching for the best card when you arrive at a store.",
          notificationColor: "#3B82F6"
        }
      });
    } catch {
      // Background updates are best-effort (no task-manager support, perms revoked, etc.); the
      // foreground watch still covers the app-alive case.
    }
  }

  async function stopBackgroundUpdates(): Promise<void> {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(ARRIVAL_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(ARRIVAL_LOCATION_TASK);
      }
    } catch {
      // ignore
    }
  }

  // Native geofences around the user's frequent places (item 8): the OS wakes us on enter/exit even when
  // killed, cheaper than continuous tracking. Best-effort and additive — continuous stop-detection stays
  // the always-on fallback; enter/exit events dedup server-side by stable per-stop eventId.
  async function syncGeofences(): Promise<void> {
    try {
      const background = await Location.getBackgroundPermissionsAsync();
      if (background.status !== "granted") return;
      const response = await arrivalApi.getMonitoredRegions();
      const regions = response.data?.regions ?? [];
      await registerArrivalGeofences(
        regions.map((r) => ({ identifier: r.identifier, lat: r.lat, lng: r.lng, radiusMeters: r.radiusMeters }))
      );
    } catch {
      // Best-effort: geofences are a battery optimization; the continuous path still covers detection.
    }
  }

  return {
    setUserId(id: string) {
      userId = id;
    },
    async start() {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      if (!subscription) {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 30_000 },
          (position) => {
            void onPosition(position);
          }
        );
      }
      await startBackgroundUpdates();
      await syncGeofences();
    },
    async stop() {
      subscription?.remove();
      subscription = null;
      anchor = null;
      await stopBackgroundUpdates();
      await stopArrivalGeofences();
    }
  };
}
