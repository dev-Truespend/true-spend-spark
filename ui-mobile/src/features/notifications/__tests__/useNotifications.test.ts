import { createElement, ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

jest.mock("@/features/notifications/api/notifications.api", () => ({
  notificationsApi: {
    getNotifications: jest.fn()
  }
}));

const { notificationsApi } = jest.requireMock("@/features/notifications/api/notifications.api") as {
  notificationsApi: { getNotifications: jest.Mock }
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  notificationsApi.getNotifications.mockReset();
});

describe("useNotifications", () => {
  it("returns empty array when response has no notifications", async () => {
    notificationsApi.getNotifications.mockResolvedValue({ data: { notifications: [] } });
    const { result } = renderHook(() => useNotifications("all"), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("returns notifications from API", async () => {
    const notification = { id: 1, typeCode: "missed_reward", title: "Title", body: "Body", isRead: false, createdAt: "2026-01-01T00:00:00Z" };
    notificationsApi.getNotifications.mockResolvedValue({ data: { notifications: [notification] } });
    const { result } = renderHook(() => useNotifications("all"), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe(1);
  });

  it("returns error message on failure", async () => {
    notificationsApi.getNotifications.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useNotifications("all"), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBe("Network error");
  });
});
