import { AxiosError } from "axios";
import { AppError } from "@/shared/errors/AppError";
import { ConflictAppError } from "@/shared/errors/ConflictAppError";
import { EntitlementRequiredAppError } from "@/shared/errors/EntitlementRequiredAppError";
import { ForbiddenAppError } from "@/shared/errors/ForbiddenAppError";
import { NetworkAppError, UnauthorizedAppError } from "@/shared/errors/NetworkAppError";
import { NotFoundAppError } from "@/shared/errors/NotFoundAppError";
import { ValidationAppError } from "@/shared/errors/ValidationAppError";
import { errorMessages } from "@/shared/errors/errorMessages";

type ClientErrorPayload = {
  success?: boolean;
  errors?: string[];
  errorCode?: string;
  featureCode?: string;
  requiredPlanCode?: string;
  message?: string;
};

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const payload = error.response?.data as ClientErrorPayload | undefined;
    const errors = Array.isArray(payload?.errors) ? payload?.errors ?? [] : [];
    const message = payload?.message ?? errors[0] ?? defaultMessageForStatus(status);

    switch (status) {
      case 400:
        return new ValidationAppError(message, errors, error);
      case 401:
        return new UnauthorizedAppError(message, error);
      case 403:
        if (payload?.errorCode === "ENTITLEMENT_REQUIRED" && payload.featureCode && payload.requiredPlanCode) {
          return new EntitlementRequiredAppError(payload.featureCode, payload.requiredPlanCode, message, error);
        }
        return new ForbiddenAppError(message, error);
      case 404:
        return new NotFoundAppError(message, error);
      case 409:
        return new ConflictAppError(message, error);
      default:
        return status && status >= 500
          ? new AppError(message, error)
          : new NetworkAppError(message, error);
    }
  }

  return new AppError(error instanceof Error ? error.message : errorMessages.unknown, error);
}

function isAxiosError(error: unknown): error is AxiosError {
  return Boolean(error && typeof error === "object" && (error as AxiosError).isAxiosError);
}

function defaultMessageForStatus(status?: number): string {
  if (!status) return errorMessages.network;
  if (status === 401) return errorMessages.unauthorized;
  if (status === 403) return errorMessages.forbidden;
  if (status === 404) return errorMessages.notFound;
  if (status === 409) return errorMessages.conflict;
  if (status === 400) return errorMessages.validation;
  return errorMessages.unknown;
}
