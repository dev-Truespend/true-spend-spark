-- Create service_level_objectives table
CREATE TABLE IF NOT EXISTS public.service_level_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  slo_type TEXT NOT NULL CHECK (slo_type IN ('availability', 'latency', 'error_rate', 'success_rate')),
  target_value NUMERIC NOT NULL,
  comparison_operator TEXT NOT NULL CHECK (comparison_operator IN ('>=', '<=', '>', '<', '=')),
  time_window TEXT NOT NULL DEFAULT '7d' CHECK (time_window IN ('1h', '24h', '7d', '30d')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create slo_compliance_history table
CREATE TABLE IF NOT EXISTS public.slo_compliance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slo_id UUID NOT NULL REFERENCES public.service_level_objectives(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_value NUMERIC NOT NULL,
  target_value NUMERIC NOT NULL,
  compliance_percentage NUMERIC NOT NULL,
  breached BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_slo_active ON public.service_level_objectives(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_slo_type ON public.service_level_objectives(slo_type);
CREATE INDEX IF NOT EXISTS idx_slo_compliance_slo_id ON public.slo_compliance_history(slo_id);
CREATE INDEX IF NOT EXISTS idx_slo_compliance_timestamp ON public.slo_compliance_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_slo_compliance_breached ON public.slo_compliance_history(breached) WHERE breached = true;

-- Enable RLS
ALTER TABLE public.service_level_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slo_compliance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can view all SLOs"
  ON public.service_level_objectives
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert SLOs"
  ON public.service_level_objectives
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update SLOs"
  ON public.service_level_objectives
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete SLOs"
  ON public.service_level_objectives
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view SLO compliance history"
  ON public.slo_compliance_history
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert compliance history"
  ON public.slo_compliance_history
  FOR INSERT
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_slo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_slo_updated_at
  BEFORE UPDATE ON public.service_level_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slo_updated_at();

-- Insert seed data for 4 default SLOs
INSERT INTO public.service_level_objectives (name, description, slo_type, target_value, comparison_operator, time_window, priority, metadata) VALUES
  (
    'API Availability',
    'API endpoints must be available 99.9% of the time',
    'availability',
    99.9,
    '>=',
    '7d',
    'critical',
    '{"unit": "%", "calculation": "successful_requests / total_requests * 100"}'::jsonb
  ),
  (
    'API Latency P95',
    '95th percentile API response time must be under 150ms',
    'latency',
    150,
    '<=',
    '7d',
    'high',
    '{"unit": "ms", "calculation": "percentile_95(response_time_ms)"}'::jsonb
  ),
  (
    'Error Rate',
    'API error rate must be below 0.1%',
    'error_rate',
    0.1,
    '<=',
    '7d',
    'high',
    '{"unit": "%", "calculation": "error_requests / total_requests * 100"}'::jsonb
  ),
  (
    'Auth Success Rate',
    'Authentication success rate must be above 99%',
    'success_rate',
    99.0,
    '>=',
    '7d',
    'critical',
    '{"unit": "%", "calculation": "successful_auth / total_auth * 100"}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;