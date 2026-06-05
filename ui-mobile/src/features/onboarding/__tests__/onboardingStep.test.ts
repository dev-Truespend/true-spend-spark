import { createElement, ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReportPermissionMutation } from "@/features/onboarding/hooks/useOnboardingQueries";

jest.mock("@/features/permissions/api/permissions.api", () => ({
  permissionsApi: {
    update: jest.fn()
  }
}));

const { permissionsApi } = jest.requireMock("@/features/permissions/api/permissions.api") as {
  permissionsApi: { update: jest.Mock };
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  permissionsApi.update.mockReset();
});

describe("useReportPermissionMutation", () => {
  it("forwards the location state to the permissions API", async () => {
    permissionsApi.update.mockResolvedValue({ success: true, data: null });
    const { result } = renderHook(() => useReportPermissionMutation(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync({ locationState: "granted" });
    });

    expect(permissionsApi.update).toHaveBeenCalledWith({ locationState: "granted", notificationsState: undefined });
  });

  it("propagates errors from the permissions API", async () => {
    permissionsApi.update.mockRejectedValue(new Error("Permission denied"));
    const { result } = renderHook(() => useReportPermissionMutation(), { wrapper: wrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync({ locationState: "denied" })).rejects.toThrow("Permission denied");
    });
  });
});
