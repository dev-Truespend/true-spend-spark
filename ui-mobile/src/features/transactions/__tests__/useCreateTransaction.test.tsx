/* region: archive — useCreateTransaction tests (removed from MVP)
 *
 * Manual transaction creation was removed from the MVP. The hook is preserved
 * as a no-op mutation that rejects; the tests for the original behaviour are
 * archived below.
 *
 * import { ReactNode } from "react";
 * import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 * import { renderHook, act } from "@testing-library/react-native";
 * import { useCreateTransaction } from "@/features/transactions/hooks/useCreateTransaction";
 *
 * jest.mock("@/features/transactions/api/transactions.api", () => ({
 *   transactionsApi: { createTransaction: jest.fn() }
 * }));
 *
 * const { transactionsApi } = jest.requireMock("@/features/transactions/api/transactions.api") as {
 *   transactionsApi: { createTransaction: jest.Mock };
 * };
 *
 * const validInput = {
 *   merchantName: "Amazon", amount: 42.0, cardId: 1,
 *   categoryCode: "shopping", transactionDate: "2024-01-15"
 * };
 *
 * function wrapper() {
 *   const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 *   const Wrapper = ({ children }: { children: ReactNode }) => (
 *     <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
 *   );
 *   Wrapper.displayName = "TestQueryProvider";
 *   return Wrapper;
 * }
 *
 * beforeEach(() => { transactionsApi.createTransaction.mockReset(); });
 *
 * describe("useCreateTransaction", () => {
 *   it("calls api with validated input on success", async () => {
 *     transactionsApi.createTransaction.mockResolvedValue({ success: true, data: {} });
 *     const { result } = renderHook(() => useCreateTransaction(), { wrapper: wrapper() });
 *     await act(async () => { await result.current.mutateAsync(validInput); });
 *     expect(transactionsApi.createTransaction).toHaveBeenCalledWith(validInput);
 *     expect(result.current.isError).toBe(false);
 *   });
 *
 *   it("throws ZodError when required fields are missing", async () => {
 *     const { result } = renderHook(() => useCreateTransaction(), { wrapper: wrapper() });
 *     await act(async () => {
 *       await expect(result.current.mutateAsync({ amount: 42.0 })).rejects.toThrow();
 *     });
 *     expect(transactionsApi.createTransaction).not.toHaveBeenCalled();
 *   });
 *
 *   it("surfaces api error on failure", async () => {
 *     transactionsApi.createTransaction.mockRejectedValue(new Error("Server error"));
 *     const { result } = renderHook(() => useCreateTransaction(), { wrapper: wrapper() });
 *     await act(async () => {
 *       await expect(result.current.mutateAsync(validInput)).rejects.toThrow("Server error");
 *     });
 *   });
 * });
 *
 * endregion */

describe.skip("useCreateTransaction (archived — manual transaction entry removed from MVP)", () => {
  it("is archived", () => {
    expect(true).toBe(true);
  });
});
