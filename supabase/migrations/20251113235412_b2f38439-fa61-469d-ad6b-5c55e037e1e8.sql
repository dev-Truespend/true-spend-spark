-- Enhance auth_attempts table for account lockout tracking
ALTER TABLE auth_attempts
ADD COLUMN IF NOT EXISTS identifier TEXT,
ADD COLUMN IF NOT EXISTS endpoint TEXT DEFAULT 'login',
ADD COLUMN IF NOT EXISTS window_start TIMESTAMPTZ DEFAULT NOW();

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identifier_time 
ON auth_attempts(identifier, created_at DESC) 
WHERE success = false;

-- Add function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(
  p_identifier TEXT,
  OUT is_locked BOOLEAN,
  OUT lock_expires_at TIMESTAMPTZ,
  OUT is_escalated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_15min INTEGER;
  failed_24h INTEGER;
  last_attempt_time TIMESTAMPTZ;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*), MAX(created_at) INTO failed_15min, last_attempt_time
  FROM auth_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  -- Count failed attempts in last 24 hours
  SELECT COUNT(*) INTO failed_24h
  FROM auth_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Check for 15-minute temporary lock (5 attempts)
  IF failed_15min >= 5 THEN
    is_locked := true;
    lock_expires_at := last_attempt_time + INTERVAL '15 minutes';
    is_escalated := false;
    RETURN;
  END IF;
  
  -- Check for escalated lock (20 attempts in 24h)
  IF failed_24h >= 20 THEN
    is_locked := true;
    lock_expires_at := NULL; -- Requires password reset
    is_escalated := true;
    RETURN;
  END IF;
  
  -- Not locked
  is_locked := false;
  lock_expires_at := NULL;
  is_escalated := false;
END;
$$;

-- Add function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_identifier TEXT,
  p_success BOOLEAN,
  p_ip_address TEXT,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO auth_attempts (
    identifier,
    user_id,
    ip_address,
    attempt_type,
    success,
    metadata
  ) VALUES (
    p_identifier,
    p_user_id,
    p_ip_address,
    'login',
    p_success,
    p_metadata
  );
END;
$$;

-- Add function to clear login attempts after successful login
CREATE OR REPLACE FUNCTION clear_login_attempts(p_identifier TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND attempt_type = 'login';
END;
$$;