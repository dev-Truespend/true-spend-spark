-- Create geofence_metrics table for telemetry and observability
CREATE TABLE IF NOT EXISTS public.geofence_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'latency', 'throughput', 'error_rate', 'cache_hit_ratio', 'ai_accuracy'
  value NUMERIC NOT NULL,
  unit TEXT, -- 'ms', 'requests/sec', 'percent', etc.
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geofence_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all metrics
CREATE POLICY "Authenticated users can read metrics"
  ON public.geofence_metrics
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow system to insert metrics (for edge functions)
CREATE POLICY "System can insert metrics"
  ON public.geofence_metrics
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_geofence_metrics_timestamp ON public.geofence_metrics(timestamp DESC);
CREATE INDEX idx_geofence_metrics_type ON public.geofence_metrics(metric_type);
CREATE INDEX idx_geofence_metrics_name ON public.geofence_metrics(metric_name);
CREATE INDEX idx_geofence_metrics_geofence_id ON public.geofence_metrics(geofence_id);

-- Enable realtime for telemetry dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_metrics;