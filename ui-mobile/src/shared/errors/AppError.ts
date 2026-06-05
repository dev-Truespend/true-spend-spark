export class AppError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}
