-- Phase 2: Enhanced Database Schema for Production Push Notifications

-- Add new columns to user_devices table
ALTER TABLE public.user_devices 
ADD COLUMN IF NOT EXISTS token_last_verified TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS token_expired BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "budget_alerts": {"enabled": true, "sound": true, "vibrate": true},
  "transactions": {"enabled": true, "sound": false, "vibrate": true},
  "geofence": {"enabled": true, "sound": true, "vibrate": true},
  "security": {"enabled": true, "sound": true, "vibrate": true},
  "marketing": {"enabled": false, "sound": false, "vibrate": false}
}'::jsonb,
ADD COLUMN IF NOT EXISTS badge_count INTEGER DEFAULT 0;

-- Create notification_categories table
CREATE TABLE IF NOT EXISTS public.notification_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  category_description TEXT,
  default_enabled BOOLEAN DEFAULT true,
  default_sound BOOLEAN DEFAULT true,
  default_vibrate BOOLEAN DEFAULT true,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notification_delivery_status table
CREATE TABLE IF NOT EXISTS public.notification_delivery_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  fcm_message_id TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default notification categories
INSERT INTO public.notification_categories (category_name, category_description, icon, color) VALUES
  ('budget_alerts', 'Budget threshold and spending alerts', '💰', '#FF5722'),
  ('transactions', 'Transaction notifications', '💳', '#2196F3'),
  ('geofence', 'Location-based alerts', '📍', '#4CAF50'),
  ('security', 'Security and account alerts', '🔒', '#F44336'),
  ('marketing', 'Promotional messages', '📢', '#9C27B0')
ON CONFLICT (category_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_devices_token_expired ON public.user_devices(token_expired);
CREATE INDEX IF NOT EXISTS idx_user_devices_token_last_verified ON public.user_devices(token_last_verified);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON public.notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_user_id ON public.notification_delivery_status(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_sent_at ON public.notification_delivery_status(sent_at);

-- Enable RLS on new tables
ALTER TABLE public.notification_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_categories (public read)
CREATE POLICY "Anyone can view notification categories"
  ON public.notification_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for notification_queue
CREATE POLICY "Users can view own notification queue"
  ON public.notification_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage notification queue"
  ON public.notification_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notification_delivery_status
CREATE POLICY "Users can view own notification delivery status"
  ON public.notification_delivery_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage notification delivery status"
  ON public.notification_delivery_status FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_notification_categories_updated_at ON public.notification_categories;
CREATE TRIGGER update_notification_categories_updated_at
  BEFORE UPDATE ON public.notification_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();

DROP TRIGGER IF EXISTS update_notification_queue_updated_at ON public.notification_queue;
CREATE TRIGGER update_notification_queue_updated_at
  BEFORE UPDATE ON public.notification_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();

-- Function to cleanup expired tokens (run daily)
CREATE OR REPLACE FUNCTION public.cleanup_expired_push_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_devices
  WHERE token_expired = true
    AND token_last_verified < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old notification logs (run weekly)
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notification_delivery_status
  WHERE sent_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;