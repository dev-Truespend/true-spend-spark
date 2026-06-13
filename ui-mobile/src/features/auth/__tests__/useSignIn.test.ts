import { act, renderHook } from "@testing-library/react-native";
import { useSignIn } from "@/features/auth/hooks/useSignIn";

jest.mock("@/features/auth/api/auth.api", () => ({
  requestEmailOtp: jest.fn(),
  requestPhoneOtp: jest.fn(),
  signInWithProvider: jest.fn()
}));

const mockCompleteSignedInSession = jest.fn();
jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ completeSignedInSession: mockCompleteSignedInSession })
}));

const { requestEmailOtp, requestPhoneOtp, signInWithProvider } = jest.requireMock("@/features/auth/api/auth.api") as {
  requestEmailOtp: jest.Mock;
  requestPhoneOtp: jest.Mock;
  signInWithProvider: jest.Mock;
};

beforeEach(() => {
  requestEmailOtp.mockReset();
  requestPhoneOtp.mockReset();
  signInWithProvider.mockReset();
  mockCompleteSignedInSession.mockReset();
});

describe("useSignIn", () => {
  it("requests an email OTP when channel is email", async () => {
    requestEmailOtp.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.startOtp("taylor@example.com", "email");
    });

    expect(requestEmailOtp).toHaveBeenCalledWith("taylor@example.com");
    expect(requestPhoneOtp).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("completes the session after a native provider sign-in", async () => {
    const session = { access_token: "a" };
    signInWithProvider.mockResolvedValue(session);
    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.startProvider("apple");
    });

    expect(signInWithProvider).toHaveBeenCalledWith("apple");
    expect(mockCompleteSignedInSession).toHaveBeenCalledWith(session);
  });

  it("does not complete a session when the provider sign-in is cancelled", async () => {
    signInWithProvider.mockResolvedValue(null);
    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.startProvider("google");
    });

    expect(mockCompleteSignedInSession).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error message when the OTP request fails", async () => {
    requestEmailOtp.mockRejectedValue(new Error("Throttled"));
    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await expect(result.current.startOtp("taylor@example.com", "email")).rejects.toThrow("Throttled");
    });

    expect(result.current.error).toBe("Throttled");
  });
});
