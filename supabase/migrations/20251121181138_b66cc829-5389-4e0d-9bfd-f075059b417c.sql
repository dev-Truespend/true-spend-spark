-- Create cost tracking table for Google Vision API
CREATE TABLE IF NOT EXISTS public.google_vision_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0.0015, -- $1.50 per 1000 images
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.google_vision_cost_tracking ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own cost tracking
CREATE POLICY "Users can view own cost tracking"
  ON public.google_vision_cost_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert cost tracking
CREATE POLICY "Service role can insert cost tracking"
  ON public.google_vision_cost_tracking
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_google_vision_cost_user_date 
  ON public.google_vision_cost_tracking(user_id, created_at DESC);

-- Add rate_limits table if not exists (for rate limiting)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_size_seconds INTEGER NOT NULL,
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start, window_size_seconds)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to rate_limits
CREATE POLICY "Service role full access to rate_limits"
  ON public.rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 day';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;