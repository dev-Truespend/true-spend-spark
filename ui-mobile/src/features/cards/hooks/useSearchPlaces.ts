import { useQuery } from "@tanstack/react-query";
import { homeApi } from "@/features/cards/api/home.api";
import { useDebounce } from "@/shared/hooks/useDebounce";

// Location-biased place search: the user types a store/brand, we return rewardable places ranked by
// proximity to their location. Reuses the NearbyMerchant pin shape so a tapped result flows through
// `selectPlace` exactly like tapping a map pin. Debounced so each keystroke doesn't hit the server.
const MIN_QUERY_LENGTH = 2;
const SEARCH_LIMIT = 25;
const DEBOUNCE_MS = 250;

type Center = { lat: number; lng: number } | null;

export function useSearchPlaces(rawQuery: string, center: Center) {
  const query = useDebounce(rawQuery.trim(), DEBOUNCE_MS);
  const enabled = query.length >= MIN_QUERY_LENGTH && center !== null;

  const result = useQuery({
    queryKey: ["search-places", query, center?.lat ?? null, center?.lng ?? null],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await homeApi.searchPlaces({
        query,
        centerLat: center!.lat,
        centerLng: center!.lng,
        limit: SEARCH_LIMIT
      });
      return res.data.merchants;
    }
  });

  return {
    results: result.data ?? [],
    // "Searching" only while a qualifying query is in flight — not while the box is empty/too short.
    isSearching: enabled && result.isFetching,
    isActive: query.length >= MIN_QUERY_LENGTH
  };
}
