import { env } from "@/shared/config/env";
import { ArrivalDetectionClient } from "@/shared/native/arrival/arrivalDetectionClient";

// Foursquare Movement (Pilgrim) SDK adapter (10a). The SDK is a paid Foursquare product not bundled
// here; it requires a Movement SDK account, the `@foursquare/movement-sdk-react-native` package plus
// iOS Podfile + Android Gradle config, and an EAS dev-client build (NOT Expo Go). Detection feeds the
// existing signature-verified `POST /api/v1/webhooks/foursquare` ingress, so this adapter only needs to
// hand the user id to the SDK and start/stop it — no direct server call from the device.
//
// Returns null until the SDK is installed and wired below. The selector treats null as "Foursquare
// unavailable" and fails over to the custom client (logged), so arrivals are never silently dropped.
export function createFoursquareMovementClient(): ArrivalDetectionClient | null {
  if (!env.foursquareMovementKey) return null;

  // To enable: install the Movement SDK, then build the adapter, e.g.
  //   import { MovementSdk } from "@foursquare/movement-sdk-react-native";
  //   return {
  //     setUserId: (id) => MovementSdk.setUserId(id),
  //     start: () => MovementSdk.start(env.foursquareMovementKey),
  //     stop: () => MovementSdk.stop(),
  //   };
  console.warn(
    "[arrival] Movement SDK key present but @foursquare/movement-sdk-react-native is not installed; " +
      "build the dev client and wire the adapter to enable the foursquare provider"
  );
  return null;
}
