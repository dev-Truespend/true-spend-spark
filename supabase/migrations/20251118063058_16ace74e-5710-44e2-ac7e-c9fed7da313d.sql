-- Phase 10: Alert Management System
-- Create alert_rules table for configuring alert routing and escalation
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  channels TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
  user_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  escalation_timeout_minutes INT DEFAULT 15,
  active BOOLEAN DEFAULT true,
  trigger_conditions JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alert_history table for tracking alert delivery and acknowledgments
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'dashboard')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'acknowledged', 'escalated')) DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON public.alert_rules(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_alert_history_incident ON public.alert_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON public.alert_history(status);
CREATE INDEX IF NOT EXISTS idx_alert_history_sent_at ON public.alert_history(sent_at DESC);

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_rules
CREATE POLICY "Admins can manage alert rules"
  ON public.alert_rules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active alert rules"
  ON public.alert_rules
  FOR SELECT
  USING (active = true);

-- RLS Policies for alert_history
CREATE POLICY "Admins can view all alert history"
  ON public.alert_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert alert history"
  ON public.alert_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can acknowledge alerts"
  ON public.alert_history
  FOR UPDATE
  USING (auth.uid() = acknowledged_by OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();

-- Insert default alert rules
INSERT INTO public.alert_rules (name, severity, channels, user_ids, trigger_conditions) VALUES
  ('Critical Incidents', 'critical', ARRAY['email', 'push']::TEXT[], ARRAY[]::UUID[], '{"incident_severity": "critical"}'::JSONB),
  ('High Priority Incidents', 'high', ARRAY['email', 'push']::TEXT[], ARRAY[]::UUID[], '{"incident_severity": "high"}'::JSONB),
  ('SLO Breaches', 'high', ARRAY['email']::TEXT[], ARRAY[]::UUID[], '{"event_type": "slo_breach"}'::JSONB),
  ('Security Alerts', 'critical', ARRAY['email', 'push']::TEXT[], ARRAY[]::UUID[], '{"event_type": "security_alert"}'::JSONB)
ON CONFLICT DO NOTHING;