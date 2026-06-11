import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Session } from "@supabase/supabase-js";
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
    await supabase.auth.signOut();
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

  const handleUnauthorized = useCallback(async () => {
    // Already signed out — a 401 here is just a request that fired before/around
    // sign-in (e.g. warmup queries on a signed-out cold start). Routing is owned
    // by restoreSession in that case; re-redirecting would make the sign-in
    // screen mount repeatedly.
    if (sessionRef.current == null) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — local clear must still proceed
    }
    await clearCachedKeys([AUTH_BOOTSTRAP_CACHE_KEY]);
    setSession(null);
    setBootstrap(null);
    router.replace("/(auth)/login");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

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
