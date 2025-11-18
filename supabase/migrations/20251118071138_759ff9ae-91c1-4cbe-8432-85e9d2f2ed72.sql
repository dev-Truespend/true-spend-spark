-- Phase 2: High Priority Fixes - Database Optimizations (Corrected)

-- 1. Add unique constraint for transaction idempotency (corrected column names)
ALTER TABLE transactions 
ADD CONSTRAINT transactions_idempotency_key UNIQUE (user_id, merchant_id, amount, timestamp);

-- 2. Create performance indexes for frequently queried tables
CREATE INDEX IF NOT EXISTS idx_system_logs_level_timestamp 
ON system_logs(level, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_component_timestamp 
ON system_logs(component, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_traces_started_at 
ON traces(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_traces_user_id_started_at 
ON traces(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_incident_sent 
ON alert_history(incident_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_status 
ON alert_history(status) WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_timestamp 
ON system_metrics(metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_status_started 
ON incidents(status, started_at DESC) WHERE status IN ('open', 'investigating');

CREATE INDEX IF NOT EXISTS idx_trace_spans_trace_id 
ON trace_spans(trace_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_log_timestamp 
ON api_request_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_geofence_events_user_timestamp 
ON geofence_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_timestamp 
ON transactions(user_id, timestamp DESC);

-- 3. Create alert retry queue table
CREATE TABLE IF NOT EXISTS alert_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_history_id UUID NOT NULL REFERENCES alert_history(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ NOT NULL,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on alert_retry_queue
ALTER TABLE alert_retry_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for alert_retry_queue (admin only)
CREATE POLICY "Admin users can view retry queue"
ON alert_retry_queue FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin users can update retry queue"
ON alert_retry_queue FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert retry queue"
ON alert_retry_queue FOR INSERT
WITH CHECK (true);

-- Index for retry queue processing
CREATE INDEX IF NOT EXISTS idx_alert_retry_queue_next_retry 
ON alert_retry_queue(next_retry_at) 
WHERE retry_count < max_retries;

-- Function to update alert_retry_queue updated_at
CREATE OR REPLACE FUNCTION update_alert_retry_queue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for alert_retry_queue
CREATE TRIGGER update_alert_retry_queue_updated_at_trigger
BEFORE UPDATE ON alert_retry_queue
FOR EACH ROW
EXECUTE FUNCTION update_alert_retry_queue_updated_at();

-- Function to cleanup old successful retries
CREATE OR REPLACE FUNCTION cleanup_old_retry_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete successfully retried entries older than 7 days
  DELETE FROM alert_retry_queue
  WHERE retry_count >= max_retries
    AND updated_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;