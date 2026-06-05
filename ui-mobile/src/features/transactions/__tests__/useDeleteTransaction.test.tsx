import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react-native";
import { useDeleteTransaction } from "@/features/transactions/hooks/useDeleteTransaction";

jest.mock("@/features/transactions/api/transactions.api", () => ({
  transactionsApi: {
    deleteTransaction: jest.fn()
  }
}));

const { transactionsApi } = jest.requireMock("@/features/transactions/api/transactions.api") as {
  transactionsApi: { deleteTransaction: jest.Mock };
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
  transactionsApi.deleteTransaction.mockReset();
});

describe("useDeleteTransaction", () => {
  it("calls api with valid id", async () => {
    transactionsApi.deleteTransaction.mockResolvedValue({ success: true, data: {} });
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync(5);
    });

    expect(transactionsApi.deleteTransaction).toHaveBeenCalledWith(5);
    expect(result.current.isError).toBe(false);
  });

  it("throws ZodError when id is not a positive integer", async () => {
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: wrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync(-1)).rejects.toThrow();
    });

    expect(transactionsApi.deleteTransaction).not.toHaveBeenCalled();
  });

  it("surfaces api error on failure", async () => {
    transactionsApi.deleteTransaction.mockRejectedValue(new Error("Delete failed"));
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: wrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync(1)).rejects.toThrow("Delete failed");
    });
  });
});
