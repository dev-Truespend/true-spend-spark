import Constants from "expo-constants";

type ExtraConfig = {
  apiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  foursquareApiKey?: string;
  plaidRedirectUri?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  apiBaseUrl: extra.apiBaseUrl ?? "",
  supabaseUrl: extra.supabaseUrl ?? "",
  supabaseAnonKey: extra.supabaseAnonKey ?? "",
  foursquareApiKey: extra.foursquareApiKey ?? "",
  plaidRedirectUri: extra.plaidRedirectUri ?? ""
};
