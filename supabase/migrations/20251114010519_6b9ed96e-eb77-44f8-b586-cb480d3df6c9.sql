-- Create test email codes table for diagnostic purposes
CREATE TABLE IF NOT EXISTS public.test_email_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_test_email_codes_email_expires ON public.test_email_codes(email, expires_at);

-- Function to cleanup expired codes (runs automatically)
CREATE OR REPLACE FUNCTION cleanup_expired_test_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.test_email_codes
  WHERE expires_at < NOW();
END;
$$;

-- No RLS needed - this is a diagnostic tool
ALTER TABLE public.test_email_codes DISABLE ROW LEVEL SECURITY;