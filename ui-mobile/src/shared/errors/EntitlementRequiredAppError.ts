import { ForbiddenAppError } from "@/shared/errors/ForbiddenAppError";

export class EntitlementRequiredAppError extends ForbiddenAppError {
  public readonly featureCode: string;
  public readonly requiredPlanCode: string;

  constructor(featureCode: string, requiredPlanCode: string, message: string, cause?: unknown) {
    super(message, cause);
    this.featureCode = featureCode;
    this.requiredPlanCode = requiredPlanCode;
  }
}
