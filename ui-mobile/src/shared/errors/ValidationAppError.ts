import { AppError } from "@/shared/errors/AppError";

export class ValidationAppError extends AppError {
  constructor(message: string, public readonly errors: string[] = [], cause?: unknown) {
    super(message, cause);
  }
}
