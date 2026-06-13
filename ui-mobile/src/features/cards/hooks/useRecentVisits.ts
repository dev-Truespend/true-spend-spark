import { useQuery } from "@tanstack/react-query";
import { homeApi } from "@/features/cards/api/home.api";

// The user's most recent merchant visits (default 3) for the home screen. Visits originate from real
// arrivals — browsing pins/category chips no longer creates them.
export function useRecentVisits(limit = 3) {
  const query = useQuery({
    queryKey: ["recent-visits", limit],
    queryFn: async () => (await homeApi.getRecentVisits(limit)).data.visits
  });
  return { visits: query.data ?? [], isLoading: query.isLoading };
}
