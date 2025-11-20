-- Create replica_metrics table for monitoring
CREATE TABLE IF NOT EXISTS public.replica_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  query_type TEXT,
  connection_type TEXT,
  latency_ms INTEGER,
  replica_healthy BOOLEAN,
  replica_lag_ms INTEGER,
  failover_count INTEGER DEFAULT 0,
  replica_query_count BIGINT DEFAULT 0,
  primary_query_count BIGINT DEFAULT 0,
  avg_replica_latency NUMERIC,
  avg_primary_latency NUMERIC,
  metadata JSONB
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_replica_metrics_timestamp ON public.replica_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_replica_metrics_connection_type ON public.replica_metrics(connection_type);

-- Enable RLS
ALTER TABLE public.replica_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read metrics
CREATE POLICY "Admins can view replica metrics"
ON public.replica_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Schedule cache prewarmer for peak hours (every 5 minutes from 6am-10pm)
SELECT cron.schedule(
  'cache-prewarmer-peak',
  '*/5 6-22 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uolpwcngftpmgkopltwz.supabase.co/functions/v1/cache-prewarmer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('time', now())
  ) as request_id;
  $$
);

-- Schedule cache prewarmer for off-peak hours (every 15 minutes from 11pm-5am)
SELECT cron.schedule(
  'cache-prewarmer-offpeak',
  '*/15 0-5,23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uolpwcngftpmgkopltwz.supabase.co/functions/v1/cache-prewarmer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('time', now())
  ) as request_id;
  $$
);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_materialized_view(view_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
END;
$$;

-- Cleanup function for old replica metrics (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_replica_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.replica_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;