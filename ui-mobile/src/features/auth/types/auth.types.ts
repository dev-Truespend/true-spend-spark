export type DeviceMetadata = {
  platformCode: "ios" | "android";
  pushToken?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
};

export type PermissionState = "unknown" | "not_determined" | "granted" | "limited" | "denied";

export type AuthBootstrapRequest = {
  locale?: string;
  timezone?: string;
  countryCode?: string;
  device?: DeviceMetadata;
};

export type ProfileResponse = {
  displayName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  currentPlanCode: string;
};

export type PreferencesResponse = {
  theme: "light" | "dark" | "system";
  locale: string;
  timezone: string;
  hideAmounts: boolean;
  biometricUnlockEnabled: boolean;
};

export type PermissionsResponse = {
  location: PermissionState;
  camera: PermissionState;
  notifications: PermissionState;
  device?: DeviceMetadata | null;
  lastReportedAt: string;
};

export type OnboardingResponse = {
  currentStepCode: string;
  cardConnectionPlaid: boolean;
  cardConnectionManual: boolean;
  cardConnectionSkipped: boolean;
  completed: boolean;
};

export type EntitlementsResponse = {
  planCode: string;
  features: Record<string, string | boolean | number>;
};

export type AuthBootstrapResponse = {
  profile: ProfileResponse;
  preferences: PreferencesResponse;
  permissions: PermissionsResponse;
  onboarding: OnboardingResponse;
  entitlements: EntitlementsResponse;
  roles: string[];
  deviceId?: number | null;
};

export type AuthRoute = "/(auth)/login" | "/(app)/onboarding" | "/(app)/(tabs)" | "/(app)/(tabs)/profile";
