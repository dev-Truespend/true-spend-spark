export type ThemeOption = "light" | "dark" | "system";

export type PreferencesResponse = {
  theme: ThemeOption;
  locale: string;
  timezone: string;
  hideAmounts: boolean;
  biometricUnlockEnabled: boolean;
};

export type UpdatePreferencesRequest = {
  theme?: ThemeOption;
  locale?: string;
  timezone?: string;
  hideAmounts?: boolean;
  biometricUnlockEnabled?: boolean;
};
