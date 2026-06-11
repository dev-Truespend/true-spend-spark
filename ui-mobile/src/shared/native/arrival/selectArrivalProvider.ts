import { env } from "@/shared/config/env";
import { registerArrivalDetectionClient } from "@/shared/native/arrival/arrivalDetectionClient";
import { createCustomArrivalClient } from "@/shared/native/arrival/customArrivalClient";
import { createFoursquareMovementClient } from "@/shared/native/arrival/foursquareMovementClient";

export type GeoProvider = "foursquare" | "custom";

// Switching providers is config-only (EXPO_PUBLIC_GEO_PROVIDER): foursquare | custom | auto.
// `auto` uses foursquare when the Movement SDK key is present, else custom.
export function selectArrivalProvider(): GeoProvider {
  const configured = (env.geoProvider || "auto").toLowerCase();
  if (configured === "foursquare") return "foursquare";
  if (configured === "custom") return "custom";
  return env.foursquareMovementKey ? "foursquare" : "custom";
}

// Runs once at bootstrap and registers exactly one client behind the shared interface. If foursquare
// is selected but the Movement SDK isn't wired, fail over to custom (logged) so arrivals aren't lost.
export function registerSelectedArrivalClient(): GeoProvider {
  const selected = selectArrivalProvider();

  if (selected === "foursquare") {
    const movementClient = createFoursquareMovementClient();
    if (movementClient) {
      registerArrivalDetectionClient(movementClient);
      return "foursquare";
    }
    console.warn("[arrival] foursquare selected but Movement SDK unavailable; falling back to custom");
  }

  registerArrivalDetectionClient(createCustomArrivalClient());
  return "custom";
}
