import { createElement, ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDetectMerchantMutation } from "@/features/home/hooks/useHomeQueries";

jest.mock("@/features/home/api/home.api", () => ({
  homeApi: {
    resolveMerchant: jest.fn(),
    getInStore: jest.fn()
  }
}));

jest.mock("@/shared/native/foursquareClient", () => ({
  searchFoursquarePlaces: jest.fn()
}));

const { homeApi } = jest.requireMock("@/features/home/api/home.api") as {
  homeApi: { resolveMerchant: jest.Mock; getInStore: jest.Mock };
};
const { searchFoursquarePlaces } = jest.requireMock("@/shared/native/foursquareClient") as {
  searchFoursquarePlaces: jest.Mock;
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = "TestQueryProvider";
  return Wrapper;
}

beforeEach(() => {
  homeApi.resolveMerchant.mockReset();
  homeApi.getInStore.mockReset();
  searchFoursquarePlaces.mockReset();
});

describe("useDetectMerchantMutation", () => {
  it("resolves the Foursquare top match and pulls an in-store recommendation", async () => {
    searchFoursquarePlaces.mockResolvedValue([
      {
        fsq_id: "fsq-1",
        name: "Target",
        location: { address: "1 Main St", locality: "Anytown", region: "CA" },
        geocodes: { main: { latitude: 37.5, longitude: -122.3 } }
      }
    ]);
    const merchant = { id: 1, name: "Target", categoryCode: "home_goods", isMultiCategory: true, address: "1 Main St, Anytown, CA" };
    homeApi.resolveMerchant.mockResolvedValue({ success: true, data: { merchant } });
    homeApi.getInStore.mockResolvedValue({ success: true, data: { recommendation: null, emptyState: null } });
    const { result } = renderHook(() => useDetectMerchantMutation(), { wrapper: wrapper() });

    await act(async () => {
      const next = await result.current.mutateAsync({ query: "Target" });
      expect(next.merchant).toEqual(merchant);
    });

    expect(searchFoursquarePlaces).toHaveBeenCalledWith({ query: "Target", ll: undefined, limit: 1 });
    expect(homeApi.resolveMerchant).toHaveBeenCalledWith(expect.objectContaining({
      name: "Target",
      provider: "foursquare",
      providerPlaceId: "fsq-1",
      lat: 37.5,
      lng: -122.3
    }));
    expect(homeApi.getInStore).toHaveBeenCalledWith({ merchantId: 1, categoryCode: "home_goods" });
  });

  it("rejects when Foursquare returns no places", async () => {
    searchFoursquarePlaces.mockResolvedValue([]);
    const { result } = renderHook(() => useDetectMerchantMutation(), { wrapper: wrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync({ query: "Unknown" })).rejects.toThrow(/No Foursquare result/u);
    });

    expect(homeApi.resolveMerchant).not.toHaveBeenCalled();
    expect(homeApi.getInStore).not.toHaveBeenCalled();
  });
});
