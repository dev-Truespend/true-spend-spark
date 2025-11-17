-- Fix Phase 6 security issues

-- Fix function search paths
DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;
DROP FUNCTION IF EXISTS update_notification_preferences_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Enable RLS on webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all webhook events"
  ON webhook_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert webhook events"
  ON webhook_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update webhook events"
  ON webhook_events FOR UPDATE
  USING (true);

-- Enable RLS on retry_queue
ALTER TABLE retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view retry queue"
  ON retry_queue FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage retry queue"
  ON retry_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable RLS on dead_letter_queue
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage DLQ"
  ON dead_letter_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert into DLQ"
  ON dead_letter_queue FOR INSERT
  WITH CHECK (true);