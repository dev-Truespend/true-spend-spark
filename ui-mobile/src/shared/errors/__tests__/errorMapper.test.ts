import { AxiosError, AxiosHeaders } from "axios";
import { toAppError } from "@/shared/errors/errorMapper";
import { errorMessages } from "@/shared/errors/errorMessages";
import { ValidationAppError } from "@/shared/errors/ValidationAppError";
import { NotFoundAppError } from "@/shared/errors/NotFoundAppError";
import { UnauthorizedAppError, NetworkAppError } from "@/shared/errors/NetworkAppError";

function axiosErrorFor(status: number, errors: string[] = []): AxiosError {
  const error = new AxiosError("error", undefined, undefined, undefined, {
    status,
    statusText: "",
    data: { success: false, errors },
    headers: {},
    config: { headers: new AxiosHeaders() }
  });
  return error;
}

describe("toAppError", () => {
  it("maps a 400 with errors to ValidationAppError carrying the raw errors but a friendly message", () => {
    const mapped = toAppError(axiosErrorFor(400, ["First", "Second"]));

    expect(mapped).toBeInstanceOf(ValidationAppError);
    // Raw server strings stay on `errors` (for forms) but the user-facing
    // message is always friendly copy — never the raw backend text.
    expect((mapped as ValidationAppError).errors).toEqual(["First", "Second"]);
    expect(mapped.message).toBe(errorMessages.validation);
  });

  it("maps a 404 to NotFoundAppError", () => {
    const mapped = toAppError(axiosErrorFor(404));

    expect(mapped).toBeInstanceOf(NotFoundAppError);
  });

  it("maps a 401 to UnauthorizedAppError", () => {
    const mapped = toAppError(axiosErrorFor(401));

    expect(mapped).toBeInstanceOf(UnauthorizedAppError);
  });

  it("treats a missing response status as a network failure", () => {
    const mapped = toAppError(new AxiosError("network down"));

    expect(mapped).toBeInstanceOf(NetworkAppError);
  });
});
