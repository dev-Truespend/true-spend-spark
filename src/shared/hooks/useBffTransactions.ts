import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";

// ── Types ───────────────────────────────────────────────────────────────

export interface BffTransaction {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  timestamp: string;
  created_at: string;
  updated_at: string;
  receipt_url: string | null;
  synced: boolean;
  location_lat: number | null;
  location_lng: number | null;
  credit_card_id: string | null;
  geofence_id: string | null;
  merchant_id: string | null;
}

export interface BffPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BffTransactionsResponse {
  transactions: BffTransaction[];
  pagination: BffPagination;
  cached: boolean;
}

export interface BffTransactionsFilters {
  page?: number;
  limit?: number;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  creditCardId?: string;
  search?: string;
  synced?: boolean;
}

// ── Hook ────────────────────────────────────────────────────────────────

/**
 * Read transactions through the `bff-transactions` Edge Function.
 *
 * Why use this instead of `supabase.from('transactions').select()`?
 *  - Server-side Redis caching (30–60s)
 *  - Auth-checked on the server (defence in depth alongside RLS)
 *  - Single endpoint for pagination + filtering + counts, so the client
 *    doesn't have to coordinate multiple round-trips
 *  - Easier to migrate to a custom backend later — the contract is fixed
 */
export function useBffTransactions(filters: BffTransactionsFilters = {}) {
  const { session } = useAuth();

  return useQuery<BffTransactionsResponse>({
    queryKey: ["bff-transactions", filters],
    enabled: !!session,
    staleTime: 1000 * 30, // matches server cache TTL
    placeholderData: keepPreviousData, // keep prior page while loading next
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page         !== undefined) params.set("page",        String(filters.page));
      if (filters.limit        !== undefined) params.set("limit",       String(filters.limit));
      if (filters.category)                   params.set("category",    filters.category);
      if (filters.dateFrom)                   params.set("dateFrom",    filters.dateFrom);
      if (filters.dateTo)                     params.set("dateTo",      filters.dateTo);
      if (filters.creditCardId)               params.set("creditCardId", filters.creditCardId);
      if (filters.search)                     params.set("search",      filters.search);
      if (filters.synced       !== undefined) params.set("synced",      String(filters.synced));

      // supabase.functions.invoke doesn't support query strings directly,
      // so we hit the function URL via fetch.
      const supabaseUrl =
        (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
      const url = `${supabaseUrl}/functions/v1/bff-transactions?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`bff-transactions failed (${res.status}): ${body}`);
      }

      return (await res.json()) as BffTransactionsResponse;
    },
  });
}
