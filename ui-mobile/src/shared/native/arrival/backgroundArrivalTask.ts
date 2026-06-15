import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { getCachedJson, setCachedJson } from "@/shared/storage/cacheStorage";
import { postGeoEvent, readBackgroundSession } from "@/shared/native/arrival/arrivalReporting";
import {
  ARRIVAL_DWELL_MS,
  StopAnchor,
  STOP_RADIUS_METERS,
  classifyMovement,
  haversineMeters,
  stableStopId
} from "@/shared/native/arrival/arrivalStopMath";

// Headless background arrival detection (10a). expo-task-manager delivers location batches even when
// the app is backgrounded or killed: iOS relaunches the app on a significant location change and
// invokes this task in a fresh JS context; Android keeps the process alive via the foreground-service
// notification started in customArrivalClient. Because the JS context can be fresh per invocation, the
// stop anchor is persisted to storage rather than held in memory. defineTask runs at module load — the
// module is imported from app/_layout.tsx so the task is registered before the OS can fire it.
//
// Best-effort: iOS background delivery lags the physical arrival; Android delivery depends on the
// visible foreground notification and is still subject to Doze/OEM throttling (out of scope this cut).

export const ARRIVAL_LOCATION_TASK = "truespend-arrival-location";

const ANCHOR_STORAGE_KEY = "arrival.background.anchor";

type ArrivalTaskData = { locations?: Location.LocationObject[] };

TaskManager.defineTask(ARRIVAL_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as ArrivalTaskData | undefined)?.locations;
  if (!locations || locations.length === 0) return;
  // The most recent fix is the one that matters for a stop.
  await handleBackgroundPosition(locations[locations.length - 1]);
});

async function handleBackgroundPosition(position: Location.LocationObject): Promise<void> {
  const { latitude, longitude, accuracy, speed } = position.coords;
  const nowMs = Date.now();

  let anchor = await getCachedJson<StopAnchor>(ANCHOR_STORAGE_KEY);
  if (anchor === null || haversineMeters(anchor.lat, anchor.lng, latitude, longitude) > STOP_RADIUS_METERS) {
    // Moving (or first fix): reset the anchor; nothing new fires. But if we'd already reported an arrival
    // at this anchor, the user is now LEAVING — emit an exit so the server closes any area session it
    // opened (item 8), instead of waiting out the TTL.
    if (anchor?.fired) {
      await reportExitHeadless(anchor);
    }
    await setCachedJson<StopAnchor>(ANCHOR_STORAGE_KEY, {
      lat: latitude,
      lng: longitude,
      sinceMs: nowMs,
      fired: false
    });
    return;
  }

  // Still near the anchor — has the user dwelled long enough to be an arrival?
  if (anchor.fired || nowMs - anchor.sinceMs < ARRIVAL_DWELL_MS) return;
  anchor = { ...anchor, fired: true };
  await setCachedJson<StopAnchor>(ANCHOR_STORAGE_KEY, anchor);
  await reportArrivalHeadless(anchor, accuracy, speed, nowMs);
}

async function reportArrivalHeadless(
  stop: StopAnchor,
  accuracy: number | null | undefined,
  speed: number | null | undefined,
  nowMs: number
): Promise<void> {
  const session = await readBackgroundSession();
  if (session === null) return;

  await postGeoEvent(session.accessToken, {
    eventId: stableStopId(session.userId, stop.lat, stop.lng, nowMs),
    eventType: "arrival",
    lat: stop.lat,
    lng: stop.lng,
    accuracyMeters: accuracy ?? null,
    occurredAt: new Date(nowMs).toISOString(),
    dwellSeconds: Math.round((nowMs - stop.sinceMs) / 1000),
    movementState: classifyMovement(speed)
  });
}

// Fired when the user leaves a stop we already reported an arrival for. The exit eventId is derived from
// the SAME stop (anchor.sinceMs) so retries dedup, but with an ":exit" suffix so it never collides with
// the arrival's id. The server closes any covering area session on this event (item 8).
async function reportExitHeadless(stop: StopAnchor): Promise<void> {
  const session = await readBackgroundSession();
  if (session === null) return;

  await postGeoEvent(session.accessToken, {
    eventId: `${stableStopId(session.userId, stop.lat, stop.lng, stop.sinceMs)}:exit`,
    eventType: "exit",
    lat: stop.lat,
    lng: stop.lng,
    accuracyMeters: null,
    occurredAt: new Date(Date.now()).toISOString(),
    dwellSeconds: null,
    movementState: "unknown"
  });
}
