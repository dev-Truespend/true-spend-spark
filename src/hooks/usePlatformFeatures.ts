import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformFeature {
  id: string;
  phase_id: string;
  feature_name: string;
  feature_description: string | null;
  platform: 'web' | 'extension' | 'mobile';
  category: string | null;
  status: 'planned' | 'in_progress' | 'complete';
  icon: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export function usePlatformFeatures() {
  return useQuery({
    queryKey: ['platform-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_features')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as PlatformFeature[];
    },
  });
}

export function useFeaturesByPhase() {
  return useQuery({
    queryKey: ['features-by-phase'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_features')
        .select(`
          *,
          phases:phase_id (
            id,
            phase_number,
            name,
            start_week,
            end_week
          )
        `)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function groupFeaturesByPhaseAndPlatform(features: any[]) {
  const grouped: Record<string, Record<string, PlatformFeature[]>> = {};
  
  features?.forEach((feature) => {
    const phaseId = feature.phase_id;
    const platform = feature.platform;
    
    if (!grouped[phaseId]) {
      grouped[phaseId] = { web: [], extension: [], mobile: [] };
    }
    
    grouped[phaseId][platform].push(feature);
  });
  
  return grouped;
}
