import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useCardsList } from "@/features/cards/hooks/useCardsList";

jest.mock("@/features/cards/api/cards.api", () => ({
  cardsApi: {
    getCards: jest.fn()
  }
}));

const { cardsApi } = jest.requireMock("@/features/cards/api/cards.api") as {
  cardsApi: { getCards: jest.Mock };
};

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  cardsApi.getCards.mockReset();
});

describe("useCardsList", () => {
  it("returns mapped cards on success", async () => {
    cardsApi.getCards.mockResolvedValue({
      success: true,
      data: {
        cards: [
          { id: 1, displayName: "Chase Sapphire", issuerName: "Chase", lastFour: "1234", source: "manual", isPrimary: true, syncStatus: "active", cardArtUrl: null }
        ],
        limits: { plaidUsed: 0, plaidLimit: 3, manualUsed: 1, manualLimit: 3, unlimited: false }
      }
    });

    const { result } = renderHook(() => useCardsList(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].displayName).toBe("Chase Sapphire");
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error message when the request fails", async () => {
    cardsApi.getCards.mockRejectedValue(new Error("Network down"));
    const { result } = renderHook(() => useCardsList(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cards).toEqual([]);
    expect(result.current.error).toBe("Network down");
  });
});
