import type { QueryClient } from "@tanstack/react-query";

const JUST_LOGGED_OUT_KEY = "ts:just-logged-out";
const LOGOUT_FLAG_TTL_MS = 30_000;

/**
 * Clear all client-side state that could leak data between users.
 *
 * Called on:
 *  - Manual sign-out (UserProfileDropdown, dashboards)
 *  - Forced sign-out (deleted account, revoked session, expired token)
 *  - Session timeout (inactivity)
 *
 * This intentionally does NOT call `supabase.auth.signOut()` — the caller
 * is expected to do that, because some scenarios (e.g. token refresh failure)
 * have already invalidated the server session.
 */
export function clearAuthState(opts: { queryClient?: QueryClient } = {}): void {
  // 1. Drop every cached query — prevents user A's data flashing for user B
  //    on the same device.
  try {
    opts.queryClient?.clear();
  } catch (err) {
    console.error("[clearAuthState] queryClient.clear failed:", err);
  }

  // 2. Remove only auth-related localStorage keys. `localStorage.clear()`
  //    would nuke unrelated app state (theme, layout prefs, etc.).
  try {
    const authPrefixes = ["sb-", "supabase.auth"];
    Object.keys(localStorage)
      .filter((k) => authPrefixes.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error("[clearAuthState] localStorage cleanup failed:", err);
  }

  // 3. Same for sessionStorage — Supabase may use it as a fallback
  try {
    const authPrefixes = ["sb-", "supabase.auth"];
    Object.keys(sessionStorage)
      .filter((k) => authPrefixes.some((p) => k.startsWith(p)))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch (err) {
    console.error("[clearAuthState] sessionStorage cleanup failed:", err);
  }

  // 4. Set a flag so the auth page can detect a fresh logout and force
  //    a clean state (preventing BFCache from showing the previous
  //    user's pages when they hit Back).
  try {
    sessionStorage.setItem(JUST_LOGGED_OUT_KEY, String(Date.now()));
  } catch {
    /* non-fatal */
  }
}

function isRecentLogoutStamp(stamp: string | null): boolean {
  if (!stamp) return false;

  const timestamp = Number(stamp);
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp < LOGOUT_FLAG_TTL_MS;
}

export function hasRecentLogoutFlag(): boolean {
  try {
    return isRecentLogoutStamp(sessionStorage.getItem(JUST_LOGGED_OUT_KEY));
  } catch {
    return false;
  }
}

/**
 * Returns true if the user just signed out in this tab — caller should
 * skip BFCache restore and force a fresh render.
 */
export function consumeJustLoggedOutFlag(): boolean {
  try {
    const stamp = sessionStorage.getItem(JUST_LOGGED_OUT_KEY);
    sessionStorage.removeItem(JUST_LOGGED_OUT_KEY);
    return isRecentLogoutStamp(stamp);
  } catch {
    return false;
  }
}
