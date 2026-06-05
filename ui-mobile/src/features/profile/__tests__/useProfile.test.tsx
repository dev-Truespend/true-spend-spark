import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useProfile } from "@/features/profile/hooks/useProfile";

jest.mock("@/features/profile/api/profile.api", () => ({
  profileApi: {
    get: jest.fn()
  }
}));

const { profileApi } = jest.requireMock("@/features/profile/api/profile.api") as {
  profileApi: { get: jest.Mock };
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  profileApi.get.mockReset();
});

describe("useProfile", () => {
  it("computes initials from the display name", async () => {
    profileApi.get.mockResolvedValue({
      success: true,
      data: {
        displayName: "Taylor Rivera",
        email: "taylor@example.com",
        phone: null,
        avatarUrl: null,
        countryCode: "US",
        currencyCode: "USD",
        currentPlanCode: "basic"
      }
    });

    const { result } = renderHook(() => useProfile(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.initials).toBe("TR");
  });

  it("falls back to the email prefix when no display name is present", async () => {
    profileApi.get.mockResolvedValue({
      success: true,
      data: {
        displayName: "",
        email: "rosa@example.com",
        phone: null,
        avatarUrl: null,
        countryCode: null,
        currencyCode: null,
        currentPlanCode: "basic"
      }
    });

    const { result } = renderHook(() => useProfile(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.initials).toBe("RO");
  });
});
