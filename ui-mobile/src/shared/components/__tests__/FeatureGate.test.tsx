import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { FeatureGate } from "@/shared/components/FeatureGate";

jest.mock("@/shared/navigation/useEntitlementGate", () => ({
  useEntitlementGate: jest.fn()
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() })
}));

const { useEntitlementGate } = jest.requireMock("@/shared/navigation/useEntitlementGate") as {
  useEntitlementGate: jest.Mock;
};

function gate(overrides: Partial<{ planCode: string; has: (c: string) => boolean }>) {
  return {
    planCode: "free",
    isPro: false,
    manualCardLimit: 1,
    plaidCardLimit: 0,
    geoRecommendationsPerDay: 1,
    unlimitedCards: false,
    has: () => false,
    value: () => null,
    ...overrides
  };
}

describe("FeatureGate", () => {
  it("renders children when the user is entitled via the feature flag", () => {
    useEntitlementGate.mockReturnValue(gate({ has: (c) => c === "ai_insights_enabled" }));

    render(
      <FeatureGate feature="ai_insights_enabled">
        <Text>Insights content</Text>
      </FeatureGate>
    );

    expect(screen.getByText("Insights content")).toBeTruthy();
  });

  it("renders children when the user's plan meets the minimum (plan-only feature)", () => {
    useEntitlementGate.mockReturnValue(gate({ planCode: "pro", has: () => false }));

    render(
      <FeatureGate feature="manual_resync_enabled">
        <Text>Sync control</Text>
      </FeatureGate>
    );

    expect(screen.getByText("Sync control")).toBeTruthy();
  });

  it("renders the upsell instead of children when locked", () => {
    useEntitlementGate.mockReturnValue(gate({ planCode: "free", has: () => false }));

    render(
      <FeatureGate feature="ai_insights_enabled">
        <Text>Insights content</Text>
      </FeatureGate>
    );

    expect(screen.queryByText("Insights content")).toBeNull();
    expect(screen.getByText(/AI insights are a Pro feature/)).toBeTruthy();
  });
});
