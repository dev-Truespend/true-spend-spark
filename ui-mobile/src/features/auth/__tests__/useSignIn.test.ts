import { act, renderHook } from "@testing-library/react-native";
import { useSignIn } from "@/features/auth/hooks/useSignIn";

jest.mock("@/features/auth/api/auth.api", () => ({
  requestEmailOtp: jest.fn(),
  requestPhoneOtp: jest.fn(),
  signInWithProvider: jest.fn()
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

  it("starts the OAuth provider flow for the selected provider", async () => {
    signInWithProvider.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.startProvider("apple");
    });

    expect(signInWithProvider).toHaveBeenCalledWith("apple");
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
