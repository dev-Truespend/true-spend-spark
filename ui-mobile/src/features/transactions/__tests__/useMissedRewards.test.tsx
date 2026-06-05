import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useMissedRewards } from "@/features/transactions/hooks/useMissedRewards";
import { useMarkNotAMiss } from "@/features/transactions/hooks/useMarkNotAMiss";

jest.mock("@/features/transactions/api/transactions.api", () => ({
  transactionsApi: {
    getMissedRewards: jest.fn(),
    markNotAMiss: jest.fn()
  }
}));

const { transactionsApi } = jest.requireMock("@/features/transactions/api/transactions.api") as {
  transactionsApi: { getMissedRewards: jest.Mock; markNotAMiss: jest.Mock };
};

const anyCard = { id: 1, displayName: "Sapphire", issuerName: "Chase", lastFour: "1234", source: "manual", isPrimary: true, syncStatus: "active", cardArtUrl: null };
const anyMoney = { amount: 10.0, currencyCode: "USD", formatted: "USD 10.00" };
const anyMissedReward = { id: 1, transactionId: 10, merchantName: "Amazon", actualCard: anyCard, betterCard: anyCard, actualReward: anyMoney, potentialReward: anyMoney, missedReward: anyMoney, isDismissed: false };

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  transactionsApi.getMissedRewards.mockReset();
  transactionsApi.markNotAMiss.mockReset();
});

describe("useMissedRewards", () => {
  it("returns missed rewards on success", async () => {
    transactionsApi.getMissedRewards.mockResolvedValue({
      success: true,
      data: { missedRewards: [anyMissedReward] }
    });

    const { result } = renderHook(() => useMissedRewards(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.missedRewards).toHaveLength(1);
    expect(result.current.missedRewards[0].merchantName).toBe("Amazon");
    expect(result.current.error).toBeNull();
  });

  it("surfaces error message on failure", async () => {
    transactionsApi.getMissedRewards.mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderHook(() => useMissedRewards(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.missedRewards).toEqual([]);
    expect(result.current.error).toBe("Unauthorized");
  });
});

describe("useMarkNotAMiss", () => {
  it("calls api with validated id on success", async () => {
    transactionsApi.markNotAMiss.mockResolvedValue({ success: true, data: {} });
    const { result } = renderHook(() => useMarkNotAMiss(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(transactionsApi.markNotAMiss).toHaveBeenCalledWith(1);
    expect(result.current.isError).toBe(false);
  });

  it("throws ZodError when id is invalid", async () => {
    const { result } = renderHook(() => useMarkNotAMiss(), { wrapper: wrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync(0)).rejects.toThrow();
    });

    expect(transactionsApi.markNotAMiss).not.toHaveBeenCalled();
  });
});
