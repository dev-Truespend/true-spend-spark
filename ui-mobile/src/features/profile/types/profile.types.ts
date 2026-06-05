export type ProfileResponse = {
  displayName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  currentPlanCode: string;
};

export type UpdateProfileRequest = {
  displayName?: string;
  phone?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
};

export type Profile = ProfileResponse & {
  initials: string;
};
