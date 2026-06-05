import { createElement, ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDismissAIInsight } from "@/features/insights/hooks/useDismissAIInsight";

jest.mock("@/features/insights/api/analytics.api", () => ({
  analyticsApi: {
    dismissInsight: jest.fn()
  }
}));

const { analyticsApi } = jest.requireMock("@/features/insights/api/analytics.api") as {
  analyticsApi: { dismissInsight: jest.Mock }
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  analyticsApi.dismissInsight.mockReset();
});

describe("useDismissAIInsight", () => {
  it("calls API with validated insightId on dismiss", async () => {
    analyticsApi.dismissInsight.mockResolvedValue({ data: { insights: [] } });
    const { result } = renderHook(() => useDismissAIInsight(), { wrapper: wrapper() });

    act(() => result.current.dismiss(1));

    await waitFor(() => !result.current.isLoading);

    expect(analyticsApi.dismissInsight).toHaveBeenCalledWith(1);
  });

  it("rejects invalid insightId (non-positive) without calling API", async () => {
    const { result } = renderHook(() => useDismissAIInsight(), { wrapper: wrapper() });

    act(() => result.current.dismiss(-5));

    await waitFor(() => result.current.error !== null);

    expect(analyticsApi.dismissInsight).not.toHaveBeenCalled();
  });
});
