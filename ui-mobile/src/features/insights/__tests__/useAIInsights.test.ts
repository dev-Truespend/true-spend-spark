import { createElement, ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAIInsights } from "@/features/insights/hooks/useAIInsights";

jest.mock("@/features/insights/api/analytics.api", () => ({
  analyticsApi: {
    getAIInsights: jest.fn()
  }
}));

const { analyticsApi } = jest.requireMock("@/features/insights/api/analytics.api") as {
  analyticsApi: { getAIInsights: jest.Mock }
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  analyticsApi.getAIInsights.mockReset();
});

describe("useAIInsights", () => {
  it("returns empty array when there are no insights", async () => {
    analyticsApi.getAIInsights.mockResolvedValue({ data: { insights: [] } });
    const { result } = renderHook(() => useAIInsights(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.insights).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("returns mapped insights from API", async () => {
    const raw = {
      insights: [
        { id: 1, typeCode: "reward_optimization", priority: "high", title: "Use Chase", body: "Details", generatedAt: "2026-01-01T00:00:00Z" }
      ]
    };
    analyticsApi.getAIInsights.mockResolvedValue({ data: raw });
    const { result } = renderHook(() => useAIInsights(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.insights).toHaveLength(1);
    expect(result.current.insights[0].id).toBe(1);
  });

  it("returns error message on API failure", async () => {
    analyticsApi.getAIInsights.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useAIInsights(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBe("Network error");
  });
});
