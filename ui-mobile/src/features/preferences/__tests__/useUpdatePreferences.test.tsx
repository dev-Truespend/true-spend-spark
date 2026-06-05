import { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdatePreferences } from "@/features/preferences/hooks/useUpdatePreferences";

jest.mock("@/features/preferences/api/preferences.api", () => ({
  preferencesApi: {
    update: jest.fn()
  }
}));

const { preferencesApi } = jest.requireMock("@/features/preferences/api/preferences.api") as {
  preferencesApi: { update: jest.Mock };
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
  preferencesApi.update.mockReset();
});

describe("useUpdatePreferences", () => {
  it("forwards a valid biometric toggle to the API", async () => {
    preferencesApi.update.mockResolvedValue({
      success: true,
      data: {
        theme: "system",
        locale: "en-US",
        timezone: "UTC",
        hideAmounts: false,
        biometricUnlockEnabled: true
      }
    });

    const { result } = renderHook(() => useUpdatePreferences(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync({ biometricUnlockEnabled: true });
    });

    expect(preferencesApi.update).toHaveBeenCalledWith({ biometricUnlockEnabled: true });
  });

  it("rejects an unknown theme via the zod schema", async () => {
    const { result } = renderHook(() => useUpdatePreferences(), { wrapper: wrapper() });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ theme: "hot-pink" as never })
      ).rejects.toThrow();
    });
    expect(preferencesApi.update).not.toHaveBeenCalled();
  });
});
