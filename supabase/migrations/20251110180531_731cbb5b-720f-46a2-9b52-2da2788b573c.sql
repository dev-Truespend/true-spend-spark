-- Phase 2: Security & Ingress - Database Schema

-- Table for rate limiting tracking
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_size_seconds INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage rate limits (edge functions)
CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view their own rate limit status
CREATE POLICY "Users can view own rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (identifier = auth.uid()::text);

-- Table for CSP violation reporting (optional)
CREATE TABLE IF NOT EXISTS public.csp_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_uri TEXT NOT NULL,
  violated_directive TEXT NOT NULL,
  blocked_uri TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_timestamp ON public.csp_violations(timestamp);
CREATE INDEX IF NOT EXISTS idx_csp_violations_directive ON public.csp_violations(violated_directive);

-- Enable RLS on csp_violations
ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can report violations
CREATE POLICY "Anyone can report CSP violations"
ON public.csp_violations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Admins can view violations
CREATE POLICY "Admins can view CSP violations"
ON public.csp_violations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Function to clean old rate limit records (called by cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to clean old CSP violations (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_csp_violations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.csp_violations
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;