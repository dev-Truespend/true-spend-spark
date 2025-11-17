-- Phase 6 Week 20: Email Infrastructure Enhancements
-- Enhance email_delivery_logs table
ALTER TABLE email_delivery_logs 
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS template_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;

-- Add index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id 
ON email_delivery_logs(resend_message_id) WHERE resend_message_id IS NOT NULL;

-- Phase 6 Week 21: Notification Preferences System
-- Create notification preferences table (SMS fields reserved for future MessageBird integration)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Email preferences
  email_enabled BOOLEAN DEFAULT true,
  email_budget_alerts BOOLEAN DEFAULT true,
  email_geofence_entry BOOLEAN DEFAULT true,
  email_geofence_exit BOOLEAN DEFAULT false,
  email_weekly_summary BOOLEAN DEFAULT true,
  email_security_alerts BOOLEAN DEFAULT true,
  email_transaction_alerts BOOLEAN DEFAULT false,
  
  -- SMS preferences (reserved for future MessageBird integration)
  sms_enabled BOOLEAN DEFAULT false,
  sms_budget_alerts BOOLEAN DEFAULT false,
  sms_geofence_entry BOOLEAN DEFAULT false,
  sms_security_alerts BOOLEAN DEFAULT false,
  
  -- Push preferences
  push_enabled BOOLEAN DEFAULT true,
  push_budget_alerts BOOLEAN DEFAULT true,
  push_geofence_entry BOOLEAN DEFAULT true,
  push_geofence_exit BOOLEAN DEFAULT true,
  push_transaction_alerts BOOLEAN DEFAULT true,
  
  -- Thresholds and timing
  budget_alert_threshold INTEGER DEFAULT 75 CHECK (budget_alert_threshold BETWEEN 50 AND 100),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Phase 6 Week 22: Webhook Infrastructure & Retry System
-- Webhook events logging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  ip_address TEXT,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry ON webhook_events(retry_count, processed);

-- Retry queue for failed operations
CREATE TABLE IF NOT EXISTS retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scheduled_for TIMESTAMPTZ NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_error TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_queue_scheduled ON retry_queue(scheduled_for, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON retry_queue(status, priority DESC);

-- Dead letter queue for permanently failed messages
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_queue_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  failure_reason TEXT NOT NULL,
  retry_history JSONB,
  manual_review_required BOOLEAN DEFAULT true,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON dead_letter_queue(resolved, created_at);

-- Feature flags for Phase 6
INSERT INTO feature_flags (flag_name, enabled, config) VALUES
('EMAIL_TEMPLATES_ENABLED', false, '{"rollout_percentage": 0}'::jsonb),
('WEBHOOK_RETRY_ENABLED', true, '{"max_retries": 5, "exponential_backoff": true}'::jsonb),
('CIRCUIT_BREAKER_ENABLED', true, '{"failure_threshold": 10, "timeout_seconds": 900}'::jsonb),
('NOTIFICATION_PREFS_DB', false, '{"migrate_from_localstorage": true}'::jsonb)
ON CONFLICT (flag_name) DO NOTHING;