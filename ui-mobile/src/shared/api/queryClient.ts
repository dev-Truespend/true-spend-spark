import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { handleEntitlementRequired } from "@/shared/errors/entitlementHandler";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleEntitlementRequired
  }),
  mutationCache: new MutationCache({
    onError: handleEntitlementRequired
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000
    }
  }
});
