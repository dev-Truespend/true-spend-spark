import { AppError } from "@/shared/errors/AppError";
import { EntitlementRequiredAppError } from "@/shared/errors/EntitlementRequiredAppError";
import { errorMessages, ErrorMessageKey } from "@/shared/errors/errorMessages";
import { toAppError } from "@/shared/errors/errorMapper";

// Single source of user-facing error text. Guarantees we never render a raw
// server/provider/SDK message: AppErrors already carry friendly copy (set in
// `toAppError`); anything else collapses to a safe fallback. Pass a feature
// `fallback` key (e.g. "plaid", "billing") for nicer context on unknown errors.
export function friendlyMessage(error: unknown, fallback: ErrorMessageKey = "unknown"): string {
  if (error instanceof EntitlementRequiredAppError) return errorMessages.entitlement;
  if (error instanceof AppError) return error.message;

  // Map a raw axios error (not yet normalized) through the same friendly path.
  if (error && typeof error === "object" && (error as { isAxiosError?: boolean }).isAxiosError) {
    const mapped = toAppError(error);
    return mapped instanceof EntitlementRequiredAppError ? errorMessages.entitlement : mapped.message;
  }

  // Plain Error / SDK error / unknown — never expose its text.
  return errorMessages[fallback];
}

// True when the error is a user-initiated Plaid Link cancellation (no toast).
// Checked by name to avoid importing the Plaid native SDK into every consumer.
export function isPlaidCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "PlaidLinkCancelledError";
}
