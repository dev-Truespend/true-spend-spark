import Constants from "expo-constants";

type ExtraConfig = {
  apiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  foursquareApiKey?: string;
  geoProvider?: string;
  foursquareMovementKey?: string;
  plaidRedirectUri?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  apiBaseUrl: extra.apiBaseUrl ?? "",
  supabaseUrl: extra.supabaseUrl ?? "",
  supabaseAnonKey: extra.supabaseAnonKey ?? "",
  foursquareApiKey: extra.foursquareApiKey ?? "",
  // 10a arrival-detection provider switch: "foursquare" | "custom" | "auto".
  geoProvider: extra.geoProvider ?? "auto",
  // Presence is the `auto` signal for the Foursquare path (distinct from the Places-search key above).
  foursquareMovementKey: extra.foursquareMovementKey ?? "",
  plaidRedirectUri: extra.plaidRedirectUri ?? "",
  // Native Google sign-in (signInWithIdToken). The Web client ID is the one Supabase has registered
  // for the Google provider; the iOS client ID is the native app client. Not secrets.
  googleWebClientId: extra.googleWebClientId ?? "",
  googleIosClientId: extra.googleIosClientId ?? ""
};
