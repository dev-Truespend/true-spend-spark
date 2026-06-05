import { env } from "@/shared/config/env";

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
