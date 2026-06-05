import { EntitlementRequiredAppError } from "@/shared/errors/EntitlementRequiredAppError";

type Handler = (error: EntitlementRequiredAppError) => void;

let handler: Handler | null = null;

export function setEntitlementRequiredHandler(value: Handler | null): void {
  handler = value;
}

export function handleEntitlementRequired(error: unknown): boolean {
  if (error instanceof EntitlementRequiredAppError && handler) {
    handler(error);
    return true;
  }
  return false;
}
