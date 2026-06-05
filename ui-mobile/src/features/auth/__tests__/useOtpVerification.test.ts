import { act, renderHook } from "@testing-library/react-native";
import { useOtpVerification } from "@/features/auth/hooks/useOtpVerification";

jest.mock("@/features/auth/api/auth.api", () => ({
  verifyEmailOtp: jest.fn(),
  verifyPhoneOtp: jest.fn()
}));

jest.mock("@/shared/api/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    }
  }
}));

const mockCompleteSignedInSession = jest.fn();
jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ completeSignedInSession: mockCompleteSignedInSession })
}));

const { verifyEmailOtp, verifyPhoneOtp } = jest.requireMock("@/features/auth/api/auth.api") as {
  verifyEmailOtp: jest.Mock;
  verifyPhoneOtp: jest.Mock;
};
const { supabase } = jest.requireMock("@/shared/api/supabaseClient") as {
  supabase: { auth: { getSession: jest.Mock } };
};

beforeEach(() => {
  verifyEmailOtp.mockReset();
  verifyPhoneOtp.mockReset();
  supabase.auth.getSession.mockReset();
  mockCompleteSignedInSession.mockReset();
});

describe("useOtpVerification", () => {
  it("completes the signed-in session after a successful email verification", async () => {
    verifyEmailOtp.mockResolvedValue(undefined);
    const session = { access_token: "token" } as never;
    supabase.auth.getSession.mockResolvedValue({ data: { session } });
    const { result } = renderHook(() => useOtpVerification());

    await act(async () => {
      await result.current.verify("taylor@example.com", "123456", "email");
    });

    expect(verifyEmailOtp).toHaveBeenCalledWith("taylor@example.com", "123456");
    expect(mockCompleteSignedInSession).toHaveBeenCalledWith(session);
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error message when verification fails", async () => {
    verifyPhoneOtp.mockRejectedValue(new Error("Invalid code"));
    const { result } = renderHook(() => useOtpVerification());

    await act(async () => {
      await expect(result.current.verify("+15555550100", "0000", "phone")).rejects.toThrow("Invalid code");
    });

    expect(result.current.error).toBe("Invalid code");
    expect(mockCompleteSignedInSession).not.toHaveBeenCalled();
  });
});
