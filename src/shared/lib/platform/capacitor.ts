export type CapacitorPlatform = "ios" | "android" | "web";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => CapacitorPlatform;
};

function getCapacitorGlobal(): CapacitorGlobal | undefined {
  return typeof window !== "undefined"
    ? ((window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor)
    : undefined;
}

export function isCapacitorNative(): boolean {
  const capacitor = getCapacitorGlobal();
  return capacitor?.isNativePlatform?.() ?? false;
}

export function getCapacitorPlatform(): CapacitorPlatform {
  const capacitor = getCapacitorGlobal();
  return capacitor?.getPlatform?.() ?? "web";
}
