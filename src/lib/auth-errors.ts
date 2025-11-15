export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  MFA_REQUIRED: "Please enter your 6-digit authentication code.",
  MFA_INVALID: "Invalid or expired authentication code.",
  ACCOUNT_LOCKED: "Too many failed attempts. Please try again later.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  GOOGLE_SIGNIN_CANCELLED: "Google sign-in was cancelled.",
  EMAIL_EXISTS_GOOGLE: "This email is already registered with Google. Please use 'Sign in with Google'.",
  EMAIL_EXISTS_LOCAL: "An account with this email already exists. Please sign in instead.",
  ACCOUNT_NOT_FOUND: "No account found. Please sign up first.",
  NETWORK_ERROR: "Network error. Please check your connection.",
  PASSWORD_REQUIRED: "Password is required for email accounts.",
  MFA_SETUP_FAILED: "Failed to set up multi-factor authentication.",
  INVALID_EMAIL: "Please enter a valid email address.",
  WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and numbers.",
} as const;

export type AuthErrorKey = keyof typeof AUTH_ERRORS;

export function getAuthError(key: AuthErrorKey): string {
  return AUTH_ERRORS[key];
}
