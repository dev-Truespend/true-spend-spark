-- Create table for Email OTP MFA codes
CREATE TABLE public.mfa_email_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mfa_email_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own OTP codes
CREATE POLICY "Users can view own OTP codes"
ON public.mfa_email_codes
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert OTP codes
CREATE POLICY "System can insert OTP codes"
ON public.mfa_email_codes
FOR INSERT
WITH CHECK (true);

-- Users can update their own OTP codes (for verification)
CREATE POLICY "Users can update own OTP codes"
ON public.mfa_email_codes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_mfa_email_codes_user_id ON public.mfa_email_codes(user_id);
CREATE INDEX idx_mfa_email_codes_expires_at ON public.mfa_email_codes(expires_at);

-- Function to cleanup expired OTP codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.mfa_email_codes
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add MFA enabled flag to user_roles table (optional per-user MFA)
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS mfa_email_enabled BOOLEAN DEFAULT false;