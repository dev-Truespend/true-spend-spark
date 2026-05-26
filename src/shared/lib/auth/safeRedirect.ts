/**
 * Sanitize a `redirectTo` value taken from the URL query string.
 *
 * Rules (all enforced):
 *  1. Must be a string — anything else collapses to the fallback.
 *  2. Must begin with a single "/" — blocks "http://...", "https://...",
 *     "javascript:...", and protocol-relative "//evil.com".
 *  3. Must NOT redirect back to `/auth`, `/login`, or any auth alias —
 *     otherwise the user lands in an infinite redirect loop after login.
 *  4. Trims trailing whitespace and rejects anything containing
 *     control characters that could split headers or break routing.
 *
 * This lets us safely accept `?redirectTo=...` from anywhere (links,
 * external services, deep links) without enabling open-redirect or
 * loop attacks.
 */

const AUTH_PATHS = new Set([
  "/auth",
  "/login",
  "/signin",
  "/sign-in",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/confirm-email-change",
]);

const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;
const MAX_REDIRECT_LENGTH = 2048;

export function safeRedirect(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (typeof raw !== "string") return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > MAX_REDIRECT_LENGTH) return fallback;

  // Must be a same-origin absolute path
  if (!trimmed.startsWith("/")) return fallback;

  // Reject protocol-relative URLs ("//evil.com/path")
  if (trimmed.startsWith("//")) return fallback;

  // Reject control characters (CR/LF/NUL/etc.)
  if (CONTROL_CHAR_RE.test(trimmed)) return fallback;

  // Reject auth pages — would loop after login
  const path = trimmed.split("?")[0].split("#")[0];
  if (AUTH_PATHS.has(path)) return fallback;

  return trimmed;
}
