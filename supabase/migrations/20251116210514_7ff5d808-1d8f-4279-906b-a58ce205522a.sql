-- Create feature_flags table for AI fallback configuration
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create transaction_events_log for idempotency tracking
CREATE TABLE IF NOT EXISTS public.transaction_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(idempotency_key, user_id)
);

-- Create index for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_transaction_events_idempotency 
ON public.transaction_events_log(idempotency_key, user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_events_correlation 
ON public.transaction_events_log(correlation_id);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_events_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_flags (admin read-only for now, public can read)
CREATE POLICY "Public can view feature flags"
ON public.feature_flags
FOR SELECT
USING (true);

-- RLS Policies for transaction_events_log (users can only see their own)
CREATE POLICY "Users can view their own transaction events"
ON public.transaction_events_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction events"
ON public.transaction_events_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default feature flags
INSERT INTO public.feature_flags (flag_name, enabled, config) VALUES
  ('ai_categorization_enabled', true, '{"fallback_to_rules": true, "max_retries": 3}'::jsonb),
  ('ai_spending_analysis_enabled', true, '{"cache_duration_hours": 24}'::jsonb),
  ('anomaly_detection_enabled', true, '{"min_transactions": 10}'::jsonb)
ON CONFLICT (flag_name) DO NOTHING;

-- Trigger for updated_at on feature_flags
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_flags_updated_at_trigger
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION update_feature_flags_updated_at();