import { Platform } from "react-native";
import Constants from "expo-constants";
import type { Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { AuthBootstrapRequest, AuthBootstrapResponse } from "@/features/auth/types/auth.types";
import { apiPost } from "@/shared/api/client";
import { supabase } from "@/shared/api/supabaseClient";
import { env } from "@/shared/config/env";

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

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  // webClientId is what Supabase validates the ID token against; iosClientId is the native app client.
  GoogleSignin.configure({ webClientId: env.googleWebClientId, iosClientId: env.googleIosClientId });
  googleConfigured = true;
}

// Native sign-in: the OS presents Apple's / Google's own account sheet (no browser, no shared cookies),
// we get an ID token, and hand it to Supabase via signInWithIdToken. Returns the new Session, or null
// if the user cancels. Each call always shows the account chooser, so a different account can sign in.
export async function signInWithProvider(provider: "apple" | "google"): Promise<Session | null> {
  // Clear any stale local session/state so the previous account can't shadow the new sign-in.
  await supabase.auth.signOut();
  return provider === "google" ? signInWithGoogle() : signInWithApple();
}

async function signInWithGoogle(): Promise<Session | null> {
  ensureGoogleConfigured();
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    // v13 returns { type, data: { idToken } }; tolerate the older flat shape too.
    const idToken =
      (response as { data?: { idToken?: string | null } }).data?.idToken ??
      (response as { idToken?: string | null }).idToken ??
      null;
    if (!idToken) throw new Error("Google sign-in did not return a token.");
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error) throw error;
    return data.session;
  } catch (err) {
    if (isCancellation(err)) return null;
    throw err;
  }
}

async function signInWithApple(): Promise<Session | null> {
  // Apple requires a hashed nonce in the request and the raw nonce passed to Supabase to bind the token.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ],
      nonce: hashedNonce
    });
    if (!credential.identityToken) throw new Error("Apple sign-in did not return a token.");
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce
    });
    if (error) throw error;
    return data.session;
  } catch (err) {
    if (isCancellation(err)) return null;
    throw err;
  }
}

// User dismissed the native sheet — not an error, just no session.
function isCancellation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === statusCodes.SIGN_IN_CANCELLED || code === "ERR_REQUEST_CANCELED";
}

export async function signOutSupabase(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
