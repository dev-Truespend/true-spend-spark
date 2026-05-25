// Phase 7: Custom hook for location analytics with optimized caching

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LocationAnalyticsBFFResponse } from '@/shared/lib/types/location';

interface UseLocationAnalyticsOptions {
  periodDays?: number;
  geofenceId?: string;
  enabled?: boolean;
}

export function useLocationAnalytics(options: UseLocationAnalyticsOptions = {}) {
  const { periodDays = 30, geofenceId, enabled = true } = options;

  return useQuery<LocationAnalyticsBFFResponse>({
    queryKey: ['location-analytics', periodDays, geofenceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('location-analytics-bff', {
        body: {
          period_days: periodDays,
          ...(geofenceId && { geofence_id: geofenceId }),
        },
      });

      if (error) throw error;
      return data as LocationAnalyticsBFFResponse;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useMerchantDiscovery(lat?: number, lng?: number, category?: string) {
  return useQuery({
    queryKey: ['merchant-discovery', lat, lng, category],
    queryFn: async () => {
      if (!lat || !lng) throw new Error('Location required');

      const { data, error } = await supabase.functions.invoke('merchant-discovery', {
        body: { lat, lng, category: category || 'restaurant' },
      });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(lat && lng),
    staleTime: 15 * 60 * 1000, // 15 minutes (cache hits expected)
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
    retry: 1,
  });
}

export function useLocationInsights(userId?: string) {
  return useQuery({
    queryKey: ['location-insights', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_insights')
        .select('*')
        .eq('actioned', false)
        .gte('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
