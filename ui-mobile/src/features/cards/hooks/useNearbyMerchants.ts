import { useQuery } from "@tanstack/react-query";
import { homeApi } from "@/features/cards/api/home.api";

// Pins are anchored to the USER, not the map viewport: fetch the rewardable places within a fixed 2 km
// radius of the user's location (the "nearby you'd actually go" range). The center is rounded so small
// GPS jitter doesn't refetch. Panning/zooming the map never refetches — the map clusters overlapping
// pins and hides them entirely when zoomed out past the radius.
const NEARBY_RADIUS_METERS = 2000;
// The cap is a safety valve for dense downtowns, not the primary filter — radius drives relevance and
// the map clusters anything that would overlap, so the nearest 60 within the ring is plenty.
const NEARBY_PIN_LIMIT = 60;

type Center = { lat: number; lng: number };

function roundedKey(center: Center | null): string | null {
  if (!center) return null;
  // ~100m granularity (3 decimals) — enough to keep the query stable while the user stays put.
  return `${center.lat.toFixed(3)},${center.lng.toFixed(3)}`;
}

export function useNearbyMerchants(center: Center | null) {
  const query = useQuery({
    queryKey: ["nearby-merchants", roundedKey(center)],
    enabled: center !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await homeApi.getNearbyMerchants({
        centerLat: center!.lat,
        centerLng: center!.lng,
        radiusMeters: NEARBY_RADIUS_METERS,
        limit: NEARBY_PIN_LIMIT
      });
      return res.data.merchants;
    }
  });

  return { merchants: query.data ?? [], isLoading: query.isLoading };
}
