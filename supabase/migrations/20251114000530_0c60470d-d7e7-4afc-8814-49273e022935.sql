-- Create password_reset_tokens table for secure single-use tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token) WHERE used_at IS NULL;
CREATE INDEX idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at) WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view their own tokens
CREATE POLICY "Users can view own reset tokens"
  ON password_reset_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Create password_history table to prevent password reuse
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_history_user ON password_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own password history (for checking reuse)
CREATE POLICY "Users can view own password history"
  ON password_history FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert password history
CREATE POLICY "System can insert password history"
  ON password_history FOR INSERT
  WITH CHECK (true);

-- Function to validate password reset token
CREATE OR REPLACE FUNCTION validate_reset_token(p_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  user_id UUID,
  expires_at TIMESTAMPTZ,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record password_reset_tokens%ROWTYPE;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM password_reset_tokens
  WHERE token = p_token;

  -- Token doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'This password reset link is invalid.'::TEXT;
    RETURN;
  END IF;

  -- Token already used
  IF v_token_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'This password reset link has already been used. Please request a new one.'::TEXT;
    RETURN;
  END IF;

  -- Token expired
  IF v_token_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'This password reset link has expired. Password reset links are valid for 30 minutes.'::TEXT;
    RETURN;
  END IF;

  -- Token is valid
  RETURN QUERY SELECT TRUE, v_token_record.user_id, v_token_record.expires_at, NULL::TEXT;
END;
$$;

-- Function to mark token as used
CREATE OR REPLACE FUNCTION mark_token_used(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE password_reset_tokens
  SET used_at = NOW()
  WHERE token = p_token;
END;
$$;

-- Function to check password against history
CREATE OR REPLACE FUNCTION check_password_history(
  p_user_id UUID,
  p_password_hash TEXT,
  p_history_count INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_count INTEGER;
BEGIN
  -- Check if password matches any of the last N passwords
  SELECT COUNT(*) INTO v_match_count
  FROM (
    SELECT password_hash
    FROM password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_history_count
  ) recent_passwords
  WHERE password_hash = p_password_hash;

  -- Return TRUE if password is in history (should be rejected)
  RETURN v_match_count > 0;
END;
$$;

-- Function to add password to history
CREATE OR REPLACE FUNCTION add_password_to_history(
  p_user_id UUID,
  p_password_hash TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO password_history (user_id, password_hash)
  VALUES (p_user_id, p_password_hash);
  
  -- Keep only last 5 passwords in history
  DELETE FROM password_history
  WHERE user_id = p_user_id
  AND id NOT IN (
    SELECT id
    FROM password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 5
  );
END;
$$;

-- Function to invalidate all user sessions (called on password change)
CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the session invalidation event
  INSERT INTO security_logs (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_user_id,
    'password_changed_sessions_invalidated',
    'info',
    jsonb_build_object('timestamp', NOW())
  );
END;
$$;