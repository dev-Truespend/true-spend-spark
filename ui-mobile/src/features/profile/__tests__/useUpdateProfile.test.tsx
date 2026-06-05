import { ReactNode } from "react";
import { act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";

jest.mock("@/features/profile/api/profile.api", () => ({
  profileApi: {
    update: jest.fn()
  }
}));

const { profileApi } = jest.requireMock("@/features/profile/api/profile.api") as {
  profileApi: { update: jest.Mock };
};

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  profileApi.update.mockReset();
});

describe("useUpdateProfile", () => {
  it("uppercases currency code and trims empty phone to null before calling the API", async () => {
    profileApi.update.mockResolvedValue({
      success: true,
      data: {
        displayName: "Taylor",
        email: "taylor@example.com",
        phone: null,
        avatarUrl: null,
        countryCode: "US",
        currencyCode: "USD",
        currentPlanCode: "basic"
      }
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync({ displayName: "Taylor", phone: "  ", currencyCode: "usd" });
    });

    expect(profileApi.update).toHaveBeenCalledWith({
      displayName: "Taylor",
      phone: null,
      countryCode: undefined,
      currencyCode: "USD"
    });
  });

  it("rejects an invalid currency code via the zod schema", async () => {
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper() });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ displayName: "Taylor", currencyCode: "US" })
      ).rejects.toThrow();
    });
    expect(profileApi.update).not.toHaveBeenCalled();
  });
});
