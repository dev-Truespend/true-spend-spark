-- Tier 1 Quick Wins: Database Schema Updates

-- 1. Email Scheduling System
ALTER TABLE email_delivery_logs 
  ADD COLUMN IF NOT EXISTS scheduled_send_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS send_status TEXT DEFAULT 'sent' CHECK (send_status IN ('pending', 'sent', 'failed', 'scheduled'));

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_scheduled 
  ON email_delivery_logs(scheduled_send_time) 
  WHERE send_status = 'scheduled';

-- 2. Saved Merchants/Favorites
CREATE TABLE IF NOT EXISTS user_favorite_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id TEXT,
  foursquare_id TEXT,
  merchant_name TEXT NOT NULL,
  merchant_category TEXT,
  merchant_address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_merchants_user 
  ON user_favorite_merchants(user_id, created_at DESC);

-- Enable RLS on favorites
ALTER TABLE user_favorite_merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorite merchants"
  ON user_favorite_merchants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Email Digest Preferences (for future batching)
CREATE TABLE IF NOT EXISTS digest_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  preferred_time TIME DEFAULT '09:00:00',
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE digest_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own digest preferences"
  ON digest_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);