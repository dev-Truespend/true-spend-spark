import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GeofenceMetric {
  id: string;
  metric_name: string;
  metric_type: string;
  value: number;
  unit: string | null;
  geofence_id: string | null;
  user_id: string | null;
  metadata: Record<string, any>;
  timestamp: string;
}

interface MetricAggregation {
  type: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export function useGeofenceMetrics(timeRangeMinutes: number = 60) {
  const [realtimeMetrics, setRealtimeMetrics] = useState<GeofenceMetric[]>([]);

  // Fetch historical metrics
  const { data: historicalMetrics, isLoading } = useQuery({
    queryKey: ['geofence-metrics', timeRangeMinutes],
    queryFn: async () => {
      const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('geofence_metrics')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data as GeofenceMetric[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('geofence-metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'geofence_metrics',
        },
        (payload) => {
          const newMetric = payload.new as GeofenceMetric;
          setRealtimeMetrics((prev) => [...prev, newMetric].slice(-100)); // Keep last 100
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Merge historical and realtime data
  const allMetrics = [...(historicalMetrics || []), ...realtimeMetrics];

  // Calculate aggregations by metric type
  const aggregations = allMetrics.reduce((acc, metric) => {
    if (!acc[metric.metric_type]) {
      acc[metric.metric_type] = {
        type: metric.metric_type,
        values: [],
        unit: metric.unit,
      };
    }
    acc[metric.metric_type].values.push(metric.value);
    return acc;
  }, {} as Record<string, any>);

  const aggregatedMetrics: MetricAggregation[] = Object.values(aggregations).map((agg: any) => {
    const values = agg.values;
    return {
      type: agg.type,
      avg: values.reduce((sum: number, v: number) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  });

  // Get KPIs
  const kpis = {
    avgLatency: aggregatedMetrics.find(m => m.type === 'latency')?.avg || 0,
    throughput: aggregatedMetrics.find(m => m.type === 'throughput')?.avg || 0,
    errorRate: aggregatedMetrics.find(m => m.type === 'error_rate')?.avg || 0,
    cacheHitRatio: aggregatedMetrics.find(m => m.type === 'cache_hit_ratio')?.avg || 0,
    aiAccuracy: aggregatedMetrics.find(m => m.type === 'ai_accuracy')?.avg || 0,
  };

  return {
    metrics: allMetrics,
    aggregatedMetrics,
    kpis,
    isLoading,
  };
}
