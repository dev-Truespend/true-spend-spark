import { env } from "@/shared/config/env";

// Foursquare Movement SDK integration point.
//
// The Movement (Pilgrim) SDK is a paid Foursquare product that requires:
//   1. A Foursquare developer account with Movement SDK access enabled.
//   2. Installing the SDK npm package (e.g. `@foursquare/movement-sdk-react-native`)
//      plus the iOS Podfile + Android Gradle config — NOT Expo Go compatible,
//      requires `npx expo prebuild` and an EAS dev client build.
//   3. Setting EXPO_PUBLIC_FOURSQUARE_API_KEY (already wired through `env`).
//   4. Granting background location permission (already requested in onboarding
//      step 2.4 via LocationPermissionPrompt scope="background").
//
// Once the SDK is installed, register it ONCE during app bootstrap by calling
// `registerFoursquareTrackingClient(...)` with an adapter that maps the SDK's
// {setUserId, start, stop} surface to this interface. After registration,
// `useFoursquareTracking` (which is already mounted in AppProviders) will gate
// on `geofencing_enabled` entitlement and call start/stop appropriately.

type TrackingState = {
  initializedFor: string | null;
};

const state: TrackingState = { initializedFor: null };

export type FoursquareTrackingClient = {
  setUserId: (externalId: string) => Promise<void> | void;
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
};

let client: FoursquareTrackingClient | null = null;

export function registerFoursquareTrackingClient(impl: FoursquareTrackingClient | null): void {
  client = impl;
}

export async function startFoursquareTracking(externalUserId: string): Promise<void> {
  if (!externalUserId) return;
  if (state.initializedFor === externalUserId) return;

  if (!client) {
    if (env.foursquareApiKey) {
      console.warn(
        "[foursquare] tracking client not registered; install and register the Foursquare Movement SDK to enable geo-arrival pushes"
      );
    }
    state.initializedFor = externalUserId;
    return;
  }

  await client.setUserId(externalUserId);
  await client.start();
  state.initializedFor = externalUserId;
}

export async function stopFoursquareTracking(): Promise<void> {
  if (state.initializedFor === null) return;
  if (client) {
    await client.stop();
  }
  state.initializedFor = null;
}

export function getFoursquareTrackingUserId(): string | null {
  return state.initializedFor;
}
