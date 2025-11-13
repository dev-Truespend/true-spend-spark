-- Create auth_attempts table for IP-based rate limiting
CREATE TABLE public.auth_attempts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL, -- 'otp_request', 'otp_verify', 'login'
  success BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for auth_attempts
CREATE POLICY "Users can view own attempts"
ON public.auth_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
ON public.auth_attempts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert attempts"
ON public.auth_attempts
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_auth_attempts_ip_address ON public.auth_attempts(ip_address);
CREATE INDEX idx_auth_attempts_user_id ON public.auth_attempts(user_id);
CREATE INDEX idx_auth_attempts_created_at ON public.auth_attempts(created_at);
CREATE INDEX idx_auth_attempts_type_success ON public.auth_attempts(attempt_type, success);

-- Create security_logs table for audit logging
CREATE TABLE public.security_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'account_locked', 'suspicious_activity'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for security_logs
CREATE POLICY "Users can view own security logs"
ON public.security_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security logs"
ON public.security_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_severity ON public.security_logs(severity);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at);

-- Create cleanup function for old auth attempts (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.auth_attempts
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create cleanup function for old security logs (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.security_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;