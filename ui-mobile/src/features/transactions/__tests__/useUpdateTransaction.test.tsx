/* region: archive — useUpdateTransaction tests (removed from MVP)
 *
 * Manual transaction edit was removed from the MVP. The hook is preserved as a
 * no-op mutation that rejects; the tests for the original behaviour are
 * archived below.
 *
 * import { ReactNode } from "react";
 * import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 * import { renderHook, act } from "@testing-library/react-native";
 * import { useUpdateTransaction } from "@/features/transactions/hooks/useUpdateTransaction";
 *
 * jest.mock("@/features/transactions/api/transactions.api", () => ({
 *   transactionsApi: { updateTransaction: jest.fn() }
 * }));
 *
 * const { transactionsApi } = jest.requireMock("@/features/transactions/api/transactions.api") as {
 *   transactionsApi: { updateTransaction: jest.Mock };
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
 * beforeEach(() => { transactionsApi.updateTransaction.mockReset(); });
 *
 * describe("useUpdateTransaction", () => {
 *   it("calls api with id and validated input on success", async () => {
 *     transactionsApi.updateTransaction.mockResolvedValue({ success: true, data: {} });
 *     const { result } = renderHook(() => useUpdateTransaction(1), { wrapper: wrapper() });
 *     const patch = { merchantName: "Whole Foods", amount: 55.0 };
 *     await act(async () => { await result.current.mutateAsync(patch); });
 *     expect(transactionsApi.updateTransaction).toHaveBeenCalledWith(1, patch);
 *     expect(result.current.isError).toBe(false);
 *   });
 *
 *   it("accepts partial update with only one field", async () => {
 *     transactionsApi.updateTransaction.mockResolvedValue({ success: true, data: {} });
 *     const { result } = renderHook(() => useUpdateTransaction(2), { wrapper: wrapper() });
 *     await act(async () => { await result.current.mutateAsync({ categoryCode: "groceries" }); });
 *     expect(transactionsApi.updateTransaction).toHaveBeenCalledWith(2, { categoryCode: "groceries" });
 *   });
 *
 *   it("surfaces api error on failure", async () => {
 *     transactionsApi.updateTransaction.mockRejectedValue(new Error("Not found"));
 *     const { result } = renderHook(() => useUpdateTransaction(99), { wrapper: wrapper() });
 *     await act(async () => {
 *       await expect(result.current.mutateAsync({ amount: 10.0 })).rejects.toThrow("Not found");
 *     });
 *   });
 * });
 *
 * endregion */

describe.skip("useUpdateTransaction (archived — manual transaction edit removed from MVP)", () => {
  it("is archived", () => {
    expect(true).toBe(true);
  });
});
