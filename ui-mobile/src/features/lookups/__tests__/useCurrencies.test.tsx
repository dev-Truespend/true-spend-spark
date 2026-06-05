import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useCurrencies } from "@/features/lookups/hooks/useCurrencies";

jest.mock("@/features/lookups/api/lookups.api", () => ({
  lookupsApi: {
    currencies: jest.fn()
  }
}));

const { lookupsApi } = jest.requireMock("@/features/lookups/api/lookups.api") as {
  lookupsApi: { currencies: jest.Mock };
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
  lookupsApi.currencies.mockReset();
});

describe("useCurrencies", () => {
  it("returns the unwrapped currencies array", async () => {
    lookupsApi.currencies.mockResolvedValue({
      success: true,
      data: { currencies: [{ code: "USD", displayName: "US Dollar", symbol: "$" }] }
    });

    const { result } = renderHook(() => useCurrencies(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ code: "USD", displayName: "US Dollar", symbol: "$" }]);
  });
});
