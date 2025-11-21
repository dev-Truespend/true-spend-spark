-- User tier configuration for scalable limits
CREATE TABLE IF NOT EXISTS user_tier_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  daily_cost_limit DECIMAL(10, 4) NOT NULL DEFAULT 5.0,
  hourly_request_limit INTEGER NOT NULL DEFAULT 50,
  monthly_request_limit INTEGER NOT NULL DEFAULT 1000,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OCR processing queue for batch/async processing
CREATE TABLE IF NOT EXISTS ocr_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  result JSONB,
  error_message TEXT,
  estimated_cost_usd DECIMAL(10, 4),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ocr_queue_status_priority 
  ON ocr_processing_queue(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_user 
  ON ocr_processing_queue(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE user_tier_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tier_config
CREATE POLICY "Users can view their own tier config"
  ON user_tier_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tier configs"
  ON user_tier_config FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for ocr_processing_queue
CREATE POLICY "Users can view their own queue items"
  ON ocr_processing_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue items"
  ON ocr_processing_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all queue items"
  ON ocr_processing_queue FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Batch processing analytics
CREATE TABLE IF NOT EXISTS ocr_batch_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_items INTEGER NOT NULL,
  successful_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  avg_processing_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_analytics_user 
  ON ocr_batch_analytics(user_id, created_at DESC);

ALTER TABLE ocr_batch_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batch analytics"
  ON ocr_batch_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all batch analytics"
  ON ocr_batch_analytics FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to update queue updated_at timestamp
CREATE OR REPLACE FUNCTION update_ocr_queue_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ocr_queue_updated_at
  BEFORE UPDATE ON ocr_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_ocr_queue_timestamp();

CREATE TRIGGER update_tier_config_updated_at
  BEFORE UPDATE ON user_tier_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ocr_queue_timestamp();