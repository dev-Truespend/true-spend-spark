import { Platform } from "react-native";
import Constants from "expo-constants";
import { AuthBootstrapRequest, AuthBootstrapResponse } from "@/features/auth/types/auth.types";
import { apiPost } from "@/shared/api/client";
import { supabase } from "@/shared/api/supabaseClient";

export async function bootstrapAuth(): Promise<AuthBootstrapResponse> {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const request: AuthBootstrapRequest = {
    locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    countryCode: extractCountryCode(locale) ?? undefined,
    device: {
      platformCode: Platform.OS === "android" ? "android" : "ios",
      appVersion: Constants.expoConfig?.version ?? null,
      osVersion: String(Platform.Version)
    }
  };

  const response = await apiPost<AuthBootstrapResponse>("/api/v1/auth/bootstrap", request);
  return response.data;
}

function extractCountryCode(locale: string): string | null {
  // Locale tags look like "en-US" or "en_US"; the region tag is the 2-letter suffix.
  const match = locale.match(/[-_]([A-Z]{2})\b/i);
  return match ? match[1].toUpperCase() : null;
}

export async function requestEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function requestPhoneOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
}

export async function signInWithProvider(provider: "apple" | "google"): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: "truespend://verify"
    }
  });
  if (error) throw error;
}

export async function signOutSupabase(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
