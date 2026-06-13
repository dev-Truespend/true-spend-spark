import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { Session, isAuthApiError } from "@supabase/supabase-js";
import { bootstrapAuth, signOutSupabase } from "@/features/auth/api/auth.api";
import { supabase } from "@/shared/api/supabaseClient";
import { getRouteForBootstrap } from "@/features/auth/mappers/authRoute.mapper";
import { AuthBootstrapResponse } from "@/features/auth/types/auth.types";
import { devicesApi } from "@/shared/api/devices.api";
import { clearCachedKeys, getCachedJson, setCachedJson } from "@/shared/storage/cacheStorage";
import { setUnauthorizedHandler } from "@/shared/api/interceptors";
import { UnauthorizedAppError } from "@/shared/errors/NetworkAppError";
import { addUrlListener, getInitialUrl, parseUrl } from "@/shared/native/linking";

const AUTH_BOOTSTRAP_CACHE_KEY = "auth.bootstrap";
const FRESH_INSTALL_MARKER_KEY = "app.fresh_install_marker.v1";

// iOS Keychain (and Android Keystore) entries persist across app uninstall by
// platform design, so a reinstalled app would silently inherit the previous
// install's Supabase session. AsyncStorage *is* wiped on uninstall, so the
// presence of this marker tells us whether the current install has launched
// before. On a fresh install we proactively clear any leftover Supabase tokens
// from secure storage so the user lands on the sign-in screen as expected.
async function purgeSecureStorageIfFreshInstall(): Promise<void> {
  const marker = await getCachedJson<boolean>(FRESH_INSTALL_MARKER_KEY);
  if (marker) return;
  try {
    // scope: "local" removes the persisted Keychain/Keystore session WITHOUT a network revoke call —
    // so a stale token from a previous install is cleared even offline or when it's already invalid
    // server-side. A global signOut can otherwise fail the network step and leave the local token in
    // place, which is exactly how a reinstalled app silently inherits the old account.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // No active session is fine — signOut still clears any persisted keys.
  }
  await clearCachedKeys([AUTH_BOOTSTRAP_CACHE_KEY]);
  await setCachedJson(FRESH_INSTALL_MARKER_KEY, true);
}

type AuthContextValue = {
  session: Session | null;
  bootstrap: AuthBootstrapResponse | null;
  isRestoring: boolean;
  isSigningOut: boolean;
  bootstrapError: string | null;
  restoreSession: () => Promise<void>;
  completeSignedInSession: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrap, setBootstrap] = useState<AuthBootstrapResponse | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  // Mirror of `session` for synchronous reads inside callbacks (e.g. the 401
  // handler) so concurrent unauthorized responses don't each fire a redirect.
  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const completeSignedInSession = useCallback(async (nextSession: Session) => {
    setSession(nextSession);
    const data = await bootstrapAuth();
    await setCachedJson(AUTH_BOOTSTRAP_CACHE_KEY, data);
    setBootstrap(data);
    setBootstrapError(null);
    router.replace(getRouteForBootstrap(data));
  }, []);

  const restoreSession = useCallback(async () => {
    setIsRestoring(true);
    setBootstrapError(null);
    try {
      await purgeSecureStorageIfFreshInstall();
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setSession(null);
        router.replace("/(auth)/login");
        return;
      }

      await completeSignedInSession(data.session);
    } catch (err) {
      if (err instanceof UnauthorizedAppError) {
        // Token is invalid — clear session and route to sign-in.
        await supabase.auth.signOut();
        await clearCachedKeys([AUTH_BOOTSTRAP_CACHE_KEY]);
        setSession(null);
        setBootstrap(null);
        router.replace("/(auth)/login");
        return;
      }
      // Transient bootstrap failure (network/server) — keep the Supabase session,
      // stay on splash, and surface a retry message instead of signing out.
      setBootstrapError(err instanceof Error ? err.message : "Could not finish signing in.");
    } finally {
      setIsRestoring(false);
    }
  }, [completeSignedInSession]);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const deviceId = bootstrap?.deviceId ?? null;
      if (deviceId) {
        try {
          await devicesApi.delete(deviceId);
        } catch {
          // device cleanup is best-effort; local session must still clear
        }
      }
      await signOutSupabase();
      await clearCachedKeys([AUTH_BOOTSTRAP_CACHE_KEY]);
      setSession(null);
      setBootstrap(null);
      router.replace("/(auth)/login");
    } finally {
      setIsSigningOut(false);
    }
  }, [bootstrap?.deviceId]);

  // Single exit for every "the session is no longer valid" signal: a 401 after a failed token refresh,
  // a Supabase SIGNED_OUT event (the refresh token was revoked — e.g. the account was deleted
  // server-side), or a foreground getUser() check that fails. Idempotent and guarded so concurrent
  // triggers fire exactly one redirect. scope: "local" guarantees the on-device session clears even if
  // the network revoke fails (the token may already be dead server-side).
  const forceSignOut = useCallback(async () => {
    // Already signed out — e.g. a warmup query 401 on a signed-out cold start (routing owned by
    // restoreSession), or a second trigger racing the first. Claim the ref synchronously to dedupe.
    if (sessionRef.current == null) return;
    sessionRef.current = null;
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore — local clear must still proceed
    }
    await clearCachedKeys([AUTH_BOOTSTRAP_CACHE_KEY]);
    setSession(null);
    setBootstrap(null);
    router.replace("/(auth)/login");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(forceSignOut);
  }, [forceSignOut]);

  // Supabase emits SIGNED_OUT when the session ends outside an explicit sign-out — most importantly when
  // a background token refresh fails because the account was deleted/revoked server-side. Without this
  // listener the app would keep showing a signed-in shell until the next failing API call.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void forceSignOut();
    });
    return () => data.subscription.unsubscribe();
  }, [forceSignOut]);

  // getSession() (used on cold start) is a LOCAL read — a deleted user's cached JWT still looks valid
  // until it expires (up to ~1h), so a warm reopen would otherwise stay on Home. On every
  // background→foreground transition we revalidate against the server with getUser(); if the account is
  // gone we sign out. Network errors are ignored (offline ≠ deleted) — only auth API errors sign out.
  useEffect(() => {
    let previous = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      if (previous.match(/inactive|background/) && next === "active" && sessionRef.current) {
        void supabase.auth.getUser().then(({ error }) => {
          if (error && isAuthApiError(error)) void forceSignOut();
        });
      }
      previous = next;
    });
    return () => sub.remove();
  }, [forceSignOut]);

  const handleAuthUrl = useCallback(async (url: string) => {
    const parsed = parseUrl(url);
    const code = getQueryParam(parsed.queryParams, "code");
    const accessToken = getQueryParam(parsed.queryParams, "access_token");
    const refreshToken = getQueryParam(parsed.queryParams, "refresh_token");

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (data.session) await completeSignedInSession(data.session);
      return;
    }

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      if (data.session) await completeSignedInSession(data.session);
    }
  }, [completeSignedInSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const subscription = addUrlListener((url) => {
      void handleAuthUrl(url);
    });

    void getInitialUrl().then((url) => {
      if (url) void handleAuthUrl(url);
    });

    return () => subscription.remove();
  }, [handleAuthUrl]);

  const value = useMemo(
    () => ({ session, bootstrap, isRestoring, isSigningOut, bootstrapError, restoreSession, completeSignedInSession, signOut }),
    [session, bootstrap, isRestoring, isSigningOut, bootstrapError, restoreSession, completeSignedInSession, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getQueryParam(queryParams: Record<string, string | string[] | undefined> | null | undefined, key: string) {
  const value = queryParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
