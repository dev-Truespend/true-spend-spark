-- Create extension_telemetry table for tracking extension usage analytics
CREATE TABLE IF NOT EXISTS extension_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  extension_version TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_extension_telemetry_user_id 
  ON extension_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_telemetry_event_type 
  ON extension_telemetry(event_type);
CREATE INDEX IF NOT EXISTS idx_extension_telemetry_timestamp 
  ON extension_telemetry(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE extension_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own telemetry
CREATE POLICY "Users can view their own telemetry"
  ON extension_telemetry FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert telemetry (edge function uses service role)
CREATE POLICY "Service role can insert telemetry"
  ON extension_telemetry FOR INSERT
  WITH CHECK (true);

-- Function to cleanup old telemetry data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_extension_telemetry()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM extension_telemetry
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comment on table
COMMENT ON TABLE extension_telemetry IS 'Stores anonymous usage analytics from browser extension';
COMMENT ON COLUMN extension_telemetry.event_type IS 'Type of event (e.g., merchant_detected, budget_viewed)';
COMMENT ON COLUMN extension_telemetry.properties IS 'Additional event metadata as JSON';
COMMENT ON COLUMN extension_telemetry.extension_version IS 'Version of the extension that sent the event';