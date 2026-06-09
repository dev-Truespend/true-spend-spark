import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";

jest.mock("@/features/billing/api/billing.api", () => ({
  billingApi: {
    getEntitlements: jest.fn()
  }
}));

const { billingApi } = jest.requireMock("@/features/billing/api/billing.api") as {
  billingApi: { getEntitlements: jest.Mock };
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
  billingApi.getEntitlements.mockReset();
});

describe("useEntitlements", () => {
  it("maps the API entitlements response to a domain shape", async () => {
    billingApi.getEntitlements.mockResolvedValue({
      success: true,
      data: {
        planCode: "pro",
        manualCardLimit: null,
        plaidCardLimit: null,
        geoRecommendationsPerDay: null,
        aiInsightsEnabled: true,
        unlimitedCards: true,
        trialing: false,
        trialEndsAt: null,
        plaidLinkingEnabled: true,
        plaidTransactionsViewEnabled: true,
        geofencingEnabled: false,
        features: { manual_card_limit: "unlimited", plaid_card_limit: "unlimited", geo_recommendations_per_day: "unlimited", ai_insights_enabled: "true", unlimited_cards: "true" }
      }
    });

    const { result } = renderHook(() => useEntitlements(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entitlements).toEqual({
      planCode: "pro",
      manualCardLimit: null,
      plaidCardLimit: null,
      geoRecommendationsPerDay: null,
      aiInsightsEnabled: true,
      unlimitedCards: true,
      trialing: false,
      trialEndsAt: null,
      plaidLinkingEnabled: true,
      plaidTransactionsViewEnabled: true,
      geofencingEnabled: false,
      features: { manual_card_limit: "unlimited", plaid_card_limit: "unlimited", geo_recommendations_per_day: "unlimited", ai_insights_enabled: "true", unlimited_cards: "true" }
    });
  });

  it("returns null entitlements until data arrives", async () => {
    billingApi.getEntitlements.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useEntitlements(), { wrapper: wrapper() });

    expect(result.current.entitlements).toBeNull();
  });
});
