-- ============================================
-- Phase 4 Tables: Budget Alerts
-- ============================================
CREATE TABLE IF NOT EXISTS public.budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_50', 'threshold_75', 'threshold_90', 'exceeded')),
  threshold_percentage INT NOT NULL CHECK (threshold_percentage >= 0 AND threshold_percentage <= 100),
  current_spent NUMERIC NOT NULL CHECK (current_spent >= 0),
  budget_limit NUMERIC NOT NULL CHECK (budget_limit >= 0),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON public.budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget_id ON public.budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_triggered_at ON public.budget_alerts(triggered_at DESC);

ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own budget alerts" ON public.budget_alerts;
CREATE POLICY "Users can view own budget alerts"
  ON public.budget_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budget alerts" ON public.budget_alerts;
CREATE POLICY "Users can update own budget alerts"
  ON public.budget_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert budget alerts" ON public.budget_alerts;
CREATE POLICY "System can insert budget alerts"
  ON public.budget_alerts FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Phase 4 Tables: Transaction Rules
-- ============================================
CREATE TABLE IF NOT EXISTS public.transaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_rules_user_id ON public.transaction_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_active ON public.transaction_rules(active) WHERE active = true;

ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own transaction rules" ON public.transaction_rules;
CREATE POLICY "Users can manage own transaction rules"
  ON public.transaction_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_transaction_rules_updated_at ON public.transaction_rules;
CREATE TRIGGER update_transaction_rules_updated_at
  BEFORE UPDATE ON public.transaction_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Phase 4 Tables: Spending Patterns Cache
-- ============================================
CREATE TABLE IF NOT EXISTS public.spending_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('monthly', 'category', 'merchant', 'geofence', 'time_of_day', 'day_of_week')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_spending_patterns_user_id ON public.spending_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_expires_at ON public.spending_patterns(expires_at);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_type_period ON public.spending_patterns(user_id, pattern_type, period_start, period_end);

ALTER TABLE public.spending_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own spending patterns" ON public.spending_patterns;
CREATE POLICY "Users can view own spending patterns"
  ON public.spending_patterns FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage spending patterns" ON public.spending_patterns;
CREATE POLICY "System can manage spending patterns"
  ON public.spending_patterns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Phase 4 Tables: Anomaly Detections
-- ============================================
CREATE TABLE IF NOT EXISTS public.anomaly_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('fraud', 'unusual_amount', 'unusual_location', 'unusual_merchant', 'duplicate', 'timing')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  details JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'false_positive', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_user_id ON public.anomaly_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_transaction_id ON public.anomaly_detections(transaction_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_status ON public.anomaly_detections(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON public.anomaly_detections(severity, detected_at DESC);

ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own anomaly detections" ON public.anomaly_detections;
CREATE POLICY "Users can manage own anomaly detections"
  ON public.anomaly_detections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Phase 4 Tables: API Request Logs (BFF Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  response_time_ms INT,
  cache_hit BOOLEAN DEFAULT false,
  payload_size_bytes INT,
  status_code INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_log_user_id ON public.api_request_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_log_endpoint ON public.api_request_log(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_request_log_created_at ON public.api_request_log(created_at DESC);

ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all API logs" ON public.api_request_log;
CREATE POLICY "Admins can view all API logs"
  ON public.api_request_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own API logs" ON public.api_request_log;
CREATE POLICY "Users can view own API logs"
  ON public.api_request_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert API logs" ON public.api_request_log;
CREATE POLICY "System can insert API logs"
  ON public.api_request_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Helper Function: Auto-trigger Budget Alerts
-- ============================================
CREATE OR REPLACE FUNCTION check_budget_thresholds()
RETURNS TRIGGER AS $$
DECLARE
  budget_record RECORD;
  spent_amount NUMERIC;
  spent_percentage NUMERIC;
BEGIN
  SELECT * INTO budget_record
  FROM public.budgets
  WHERE (geofence_id = NEW.geofence_id OR category = NEW.category)
    AND user_id = NEW.user_id
    AND active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF budget_record IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO spent_amount
    FROM public.transactions
    WHERE user_id = NEW.user_id
      AND (geofence_id = budget_record.geofence_id OR category = budget_record.category)
      AND timestamp >= budget_record.start_date
      AND (budget_record.end_date IS NULL OR timestamp <= budget_record.end_date);

    spent_percentage := (spent_amount / NULLIF(budget_record.limit_amount, 0)) * 100;

    IF spent_percentage >= 50 AND NOT EXISTS (
      SELECT 1 FROM public.budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'threshold_50'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO public.budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'threshold_50', 50, spent_amount, budget_record.limit_amount);
    END IF;

    IF spent_percentage >= 75 AND NOT EXISTS (
      SELECT 1 FROM public.budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'threshold_75'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO public.budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'threshold_75', 75, spent_amount, budget_record.limit_amount);
    END IF;

    IF spent_percentage >= 90 AND NOT EXISTS (
      SELECT 1 FROM public.budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'threshold_90'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO public.budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'threshold_90', 90, spent_amount, budget_record.limit_amount);
    END IF;

    IF spent_percentage >= 100 AND NOT EXISTS (
      SELECT 1 FROM public.budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'exceeded'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO public.budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'exceeded', 100, spent_amount, budget_record.limit_amount);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_check_budget_thresholds ON public.transactions;
CREATE TRIGGER trigger_check_budget_thresholds
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_thresholds();