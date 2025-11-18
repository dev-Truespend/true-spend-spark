-- Phase 10: Observability & Polish - Database Schema (Fixed)

-- Structured system logging table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_id TEXT,
  trace_id UUID REFERENCES public.traces(id) ON DELETE SET NULL,
  stack_trace TEXT,
  user_agent TEXT,
  ip_address_hash TEXT
);

-- Indexes for system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON public.system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id) WHERE user_id IS NOT NULL;

-- Aggregated system metrics table
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  tags JSONB DEFAULT '{}'
);

-- Indexes for system_metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON public.system_metrics(timestamp DESC);

-- Incident management table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  title TEXT NOT NULL,
  description TEXT,
  affected_services TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  auto_detected BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for incidents
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON public.incidents(started_at DESC);

-- Incident alerts tracking table
CREATE TABLE IF NOT EXISTS public.incident_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'webhook', 'push')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

-- Indexes for incident_alerts
CREATE INDEX IF NOT EXISTS idx_incident_alerts_incident_id ON public.incident_alerts(incident_id);

-- SLI metrics tracking table (Service Level Indicators)
CREATE TABLE IF NOT EXISTS public.sli_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sli_name TEXT NOT NULL,
  target_percent NUMERIC NOT NULL,
  actual_percent NUMERIC NOT NULL,
  sample_count INTEGER,
  period TEXT NOT NULL DEFAULT 'hourly' CHECK (period IN ('hourly', 'daily', 'weekly', 'monthly')),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for sli_metrics
CREATE INDEX IF NOT EXISTS idx_sli_metrics_name_time ON public.sli_metrics(sli_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sli_metrics_timestamp ON public.sli_metrics(timestamp DESC);

-- Cleanup function for old system logs (30-day retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_system_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.system_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Cleanup function for old system metrics (90-day retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_system_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.system_metrics
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Cleanup function for resolved incidents (180-day retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_incidents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.incidents
  WHERE status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '180 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sli_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all system logs" ON public.system_logs;
DROP POLICY IF EXISTS "System can insert system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admins can delete system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admins can view all system metrics" ON public.system_metrics;
DROP POLICY IF EXISTS "System can insert system metrics" ON public.system_metrics;
DROP POLICY IF EXISTS "Admins can delete system metrics" ON public.system_metrics;
DROP POLICY IF EXISTS "Admins can manage all incidents" ON public.incidents;
DROP POLICY IF EXISTS "System can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Admins can view all incident alerts" ON public.incident_alerts;
DROP POLICY IF EXISTS "System can insert incident alerts" ON public.incident_alerts;
DROP POLICY IF EXISTS "Admins can view all SLI metrics" ON public.sli_metrics;
DROP POLICY IF EXISTS "System can insert SLI metrics" ON public.sli_metrics;
DROP POLICY IF EXISTS "Admins can delete SLI metrics" ON public.sli_metrics;

-- RLS Policies for system_logs (admin-only access)
CREATE POLICY "Admins can view all system logs"
  ON public.system_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert system logs"
  ON public.system_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete system logs"
  ON public.system_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for system_metrics (admin-only access)
CREATE POLICY "Admins can view all system metrics"
  ON public.system_metrics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert system metrics"
  ON public.system_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete system metrics"
  ON public.system_metrics FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for incidents (admin management)
CREATE POLICY "Admins can manage all incidents"
  ON public.incidents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (true);

-- RLS Policies for incident_alerts (admin-only access)
CREATE POLICY "Admins can view all incident alerts"
  ON public.incident_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert incident alerts"
  ON public.incident_alerts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for sli_metrics (admin-only access)
CREATE POLICY "Admins can view all SLI metrics"
  ON public.sli_metrics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert SLI metrics"
  ON public.sli_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete SLI metrics"
  ON public.sli_metrics FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));