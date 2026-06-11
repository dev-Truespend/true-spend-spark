import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { env } from "@/shared/config/env";
import { supabase } from "@/shared/api/supabaseClient";
import { getCachedJson, setCachedJson } from "@/shared/storage/cacheStorage";
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
    // Moving (or first fix): reset the anchor; nothing fires.
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
  // No React/auth context in the background — read the persisted Supabase session directly (it
  // auto-refreshes), then POST with the device JWT. The server derives userId from the token.
  let accessToken: string | null = null;
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token ?? null;
    userId = data.session?.user?.id ?? null;
  } catch {
    return;
  }
  if (!accessToken || !userId) return;

  const body = {
    eventId: stableStopId(userId, stop.lat, stop.lng, nowMs),
    eventType: "arrival",
    lat: stop.lat,
    lng: stop.lng,
    accuracyMeters: accuracy ?? null,
    occurredAt: new Date(nowMs).toISOString(),
    dwellSeconds: Math.round((nowMs - stop.sinceMs) / 1000),
    movementState: classifyMovement(speed)
  };

  try {
    await fetch(`${env.apiBaseUrl}/api/v1/geo/arrival`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
  } catch {
    // Best-effort: a dropped arrival just means no nudge this stop. The eventId is stable per stop, so
    // a later retry/foreground report at the same stop dedups instead of double-notifying.
  }
}
