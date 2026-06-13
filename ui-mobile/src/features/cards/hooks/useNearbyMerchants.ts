import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { homeApi, type NearbyMerchantsInput } from "@/features/cards/api/home.api";

// Holds the current map viewport and fetches up to ~30 rewardable pins for it. The map calls
// `setViewport` (debounced) on pan/zoom; prior pins are kept on screen while the next set loads.
export function useNearbyMerchants() {
  const [viewport, setViewport] = useState<NearbyMerchantsInput | null>(null);

  const query = useQuery({
    queryKey: ["nearby-merchants", viewport],
    enabled: viewport !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await homeApi.getNearbyMerchants(viewport!);
      return res.data.merchants;
    }
  });

  const updateViewport = useCallback((next: NearbyMerchantsInput) => setViewport(next), []);

  return { merchants: query.data ?? [], setViewport: updateViewport, isLoading: query.isLoading };
}
