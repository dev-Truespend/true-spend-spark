// Provider-neutral arrival-detection plug-point (10a). Generalizes the former
// `registerFoursquareTrackingClient` so both code sets — the Foursquare Movement SDK adapter and the
// own-built `custom` client — register behind one interface. The selector wires exactly one.

export type ArrivalDetectionClient = {
  setUserId: (userId: string) => Promise<void> | void;
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
};

type TrackingState = {
  initializedFor: string | null;
};

const state: TrackingState = { initializedFor: null };

let client: ArrivalDetectionClient | null = null;

export function registerArrivalDetectionClient(impl: ArrivalDetectionClient | null): void {
  client = impl;
}

export function getRegisteredArrivalClient(): ArrivalDetectionClient | null {
  return client;
}

export async function startArrivalTracking(userId: string): Promise<void> {
  if (!userId) return;
  if (state.initializedFor === userId) return;

  if (!client) {
    // No provider selected (neither SDK present nor custom configured): fail closed + observable.
    console.warn("[arrival] no detection client registered; geo-arrival pushes are disabled");
    state.initializedFor = userId;
    return;
  }

  await client.setUserId(userId);
  await client.start();
  state.initializedFor = userId;
}

export async function stopArrivalTracking(): Promise<void> {
  if (state.initializedFor === null) return;
  if (client) {
    await client.stop();
  }
  state.initializedFor = null;
}

export function getArrivalTrackingUserId(): string | null {
  return state.initializedFor;
}
