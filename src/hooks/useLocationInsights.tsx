import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LocationInsight {
  id: string;
  geofence_id: string | null;
  insight_type: 'spending_pattern' | 'budget_recommendation' | 'anomaly_detection' | 'optimization';
  confidence_score: number;
  recommendation: string;
  metadata: {
    reasoning?: string;
  };
  created_at: string;
}

export function useLocationInsights() {
  return useQuery({
    queryKey: ['location-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_insights')
        .select('*, geofences(name, type)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as LocationInsight[];
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useTriggerInsightsAnalysis() {
  const triggerAnalysis = async () => {
    const { data, error } = await supabase.functions.invoke('location-insights-ai', {
      body: {},
    });

    if (error) throw error;
    return data;
  };

  return { triggerAnalysis };
}
