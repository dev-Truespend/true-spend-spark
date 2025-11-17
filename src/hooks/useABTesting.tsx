import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ABExperiment {
  id: string;
  experiment_name: string;
  description: string | null;
  status: string;
  variants: string[];
  target_metric: string;
  start_date: string;
  end_date: string | null;
}

export function useABTesting() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's variant for an experiment
  const useExperimentVariant = (experimentId: string) => {
    return useQuery({
      queryKey: ['experiment-variant', experimentId, user?.id],
      queryFn: async () => {
        if (!user) return null;

        // Check if user already assigned
        const { data: assignment } = await supabase
          .from('user_experiment_assignments')
          .select('variant')
          .eq('user_id', user.id)
          .eq('experiment_id', experimentId)
          .single();

        if (assignment) {
          return assignment.variant;
        }

        // Assign variant via edge function
        const { data, error } = await supabase.functions.invoke('ab-testing-manager', {
          body: {
            action: 'assign',
            experiment_id: experimentId,
          },
        });

        if (error) throw error;
        return data.variant;
      },
      enabled: !!user && !!experimentId,
      staleTime: Infinity, // Variant assignments shouldn't change
    });
  };

  // Track metric for experiment
  const trackMetric = useMutation({
    mutationFn: async ({
      experimentId,
      metricName,
      metricValue,
    }: {
      experimentId: string;
      metricName: string;
      metricValue: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('ab-testing-manager', {
        body: {
          action: 'track_metric',
          experiment_id: experimentId,
          metric_name: metricName,
          metric_value: metricValue,
        },
      });

      if (error) throw error;
      return data;
    },
  });

  // Get all active experiments
  const useActiveExperiments = () => {
    return useQuery({
      queryKey: ['active-experiments'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('ab_experiments')
          .select('*')
          .eq('status', 'running')
          .order('start_date', { ascending: false });

        if (error) throw error;
        return data as ABExperiment[];
      },
    });
  };

  // Get experiment results (admin only)
  const useExperimentResults = (experimentId: string) => {
    return useQuery({
      queryKey: ['experiment-results', experimentId],
      queryFn: async () => {
        const { data: metrics, error } = await supabase
          .from('experiment_metrics')
          .select('*')
          .eq('experiment_id', experimentId);

        if (error) throw error;

        // Group by variant and calculate statistics
        const variantStats = metrics.reduce((acc: any, metric: any) => {
          if (!acc[metric.variant]) {
            acc[metric.variant] = {
              variant: metric.variant,
              count: 0,
              total: 0,
              metrics: {},
            };
          }
          acc[metric.variant].count++;
          acc[metric.variant].total += metric.metric_value || 0;
          
          if (!acc[metric.variant].metrics[metric.metric_name]) {
            acc[metric.variant].metrics[metric.metric_name] = {
              sum: 0,
              count: 0,
              values: [],
            };
          }
          acc[metric.variant].metrics[metric.metric_name].sum += metric.metric_value || 0;
          acc[metric.variant].metrics[metric.metric_name].count++;
          acc[metric.variant].metrics[metric.metric_name].values.push(metric.metric_value || 0);
          
          return acc;
        }, {});

        return Object.values(variantStats);
      },
      enabled: !!experimentId,
    });
  };

  return {
    useExperimentVariant,
    trackMetric,
    useActiveExperiments,
    useExperimentResults,
  };
}
