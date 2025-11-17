-- Phase 8.1: Event Bus Foundation
-- Creates persistent event log with retry logic and DLQ integration

-- Event log table (persistent queue)
CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Performance indexes for event processing
CREATE INDEX IF NOT EXISTS idx_event_log_status_scheduled 
  ON event_log(status, scheduled_for) 
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_event_log_topic_user 
  ON event_log(topic, user_id);

CREATE INDEX IF NOT EXISTS idx_event_log_type_created 
  ON event_log(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_log_user_status 
  ON event_log(user_id, status, created_at DESC);

-- Enable Realtime for immediate event delivery
ALTER PUBLICATION supabase_realtime ADD TABLE event_log;

-- Enable Row Level Security
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can insert events" 
  ON event_log 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update events" 
  ON event_log 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can view own events" 
  ON event_log 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events" 
  ON event_log 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER event_log_updated_at
  BEFORE UPDATE ON event_log
  FOR EACH ROW
  EXECUTE FUNCTION update_event_log_updated_at();