-- Create email rate limiting table
CREATE TABLE IF NOT EXISTS public.email_rate_limits (
  email TEXT NOT NULL PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (managed by edge functions)
CREATE POLICY "Service role only" ON public.email_rate_limits
  FOR ALL
  USING (false);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_email ON public.email_rate_limits(email);
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_window ON public.email_rate_limits(window_start);