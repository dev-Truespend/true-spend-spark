import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useTransactionsList } from "@/features/transactions/hooks/useTransactionsList";

jest.mock("@/features/transactions/api/transactions.api", () => ({
  transactionsApi: {
    getTransactions: jest.fn()
  }
}));

const { transactionsApi } = jest.requireMock("@/features/transactions/api/transactions.api") as {
  transactionsApi: { getTransactions: jest.Mock };
};

const anyCard = { id: 1, displayName: "Sapphire", issuerName: "Chase", lastFour: "1234", source: "manual", isPrimary: true, syncStatus: "active", cardArtUrl: null };
const anyMoney = { amount: 42.0, currencyCode: "USD", formatted: "USD 42.00" };
const anyTransaction = { id: 1, merchantName: "Amazon", amount: anyMoney, card: anyCard, transactionDate: "2024-01-15", source: "manual", isPending: false };

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  transactionsApi.getTransactions.mockReset();
});

describe("useTransactionsList", () => {
  it("returns mapped transactions on success", async () => {
    transactionsApi.getTransactions.mockResolvedValue({
      success: true,
      data: { transactions: [anyTransaction], emptyState: false }
    });

    const { result } = renderHook(() => useTransactionsList(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].merchantName).toBe("Amazon");
    expect(result.current.emptyState).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns emptyState=true when list is empty", async () => {
    transactionsApi.getTransactions.mockResolvedValue({
      success: true,
      data: { transactions: [], emptyState: true }
    });

    const { result } = renderHook(() => useTransactionsList(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual([]);
    expect(result.current.emptyState).toBe(true);
  });

  it("surfaces error message on failure", async () => {
    transactionsApi.getTransactions.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useTransactionsList(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBe("Network error");
  });
});
