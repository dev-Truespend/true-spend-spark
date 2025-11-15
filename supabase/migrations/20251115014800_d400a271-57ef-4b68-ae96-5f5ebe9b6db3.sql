-- ============================================================================
-- Push Notifications Support Tables
-- ============================================================================

-- User devices table for FCM tokens
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'unknown')),
  device_name TEXT,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

-- Push notification logs
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can view their own notification logs" ON public.push_notification_logs;
DROP POLICY IF EXISTS "Admins can view all notification logs" ON public.push_notification_logs;

-- RLS Policies for user_devices
CREATE POLICY "Users can manage their own devices"
  ON public.user_devices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for push_notification_logs
CREATE POLICY "Users can view their own notification logs"
  ON public.push_notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs"
  ON public.push_notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fcm_token ON public.user_devices(fcm_token);
CREATE INDEX IF NOT EXISTS idx_push_logs_user_id ON public.push_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_sent_at ON public.push_notification_logs(sent_at DESC);

-- Create trigger to update updated_at on user_devices
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_devices_updated_at ON public.user_devices;

CREATE TRIGGER trigger_update_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();