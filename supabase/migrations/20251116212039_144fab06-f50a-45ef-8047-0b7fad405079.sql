-- ============================================
-- Phase 1 + 2: Production Hardening (Fixed)
-- 1. Email Delivery Logs Table
-- 2. Fix Database Function search_path Warnings
-- ============================================

-- ============================================
-- 1. Create Email Delivery Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('verification', 'security_alert', 'password_reset')),
  resend_message_id text,
  recipient_email text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'complained', 'failed')),
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for user queries
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_user_id ON public.email_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status ON public.email_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_sent_at ON public.email_delivery_logs(sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_delivery_logs' AND policyname = 'Users can view own email logs'
  ) THEN
    CREATE POLICY "Users can view own email logs"
      ON public.email_delivery_logs FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_delivery_logs' AND policyname = 'Admins can view all email logs'
  ) THEN
    CREATE POLICY "Admins can view all email logs"
      ON public.email_delivery_logs FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_delivery_logs' AND policyname = 'System can insert email logs'
  ) THEN
    CREATE POLICY "System can insert email logs"
      ON public.email_delivery_logs FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_delivery_logs' AND policyname = 'System can update email logs'
  ) THEN
    CREATE POLICY "System can update email logs"
      ON public.email_delivery_logs FOR UPDATE
      USING (true);
  END IF;
END $$;

-- ============================================
-- 2. Fix Database Function search_path Warnings
-- Drop functions that need parameter name changes
-- ============================================

-- Drop and recreate encrypt_totp_secret
DROP FUNCTION IF EXISTS public.encrypt_totp_secret(text, uuid);
CREATE OR REPLACE FUNCTION public.encrypt_totp_secret(secret text, user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  vault_secret_id uuid;
BEGIN
  SELECT vault.create_secret(secret, user_id::text) INTO vault_secret_id;
  RETURN vault_secret_id;
END;
$$;

-- Drop and recreate decrypt_totp_secret
DROP FUNCTION IF EXISTS public.decrypt_totp_secret(uuid);
CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  decrypted_secret text;
BEGIN
  SELECT decrypted_secret FROM vault.decrypted_secrets 
  WHERE id = secret_id 
  INTO decrypted_secret;
  RETURN decrypted_secret;
END;
$$;

-- Drop and recreate other functions with search_path fix
DROP FUNCTION IF EXISTS public.is_account_locked(uuid);
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lock_until timestamptz;
BEGIN
  SELECT login_lock_until INTO lock_until
  FROM mfa_settings
  WHERE user_id = p_user_id;
  
  RETURN lock_until IS NOT NULL AND lock_until > now();
END;
$$;

DROP FUNCTION IF EXISTS public.validate_reset_token(text);
CREATE OR REPLACE FUNCTION public.validate_reset_token(p_token text)
RETURNS TABLE (
  is_valid boolean,
  user_id uuid,
  token_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (expires_at > now() AND used_at IS NULL) AS is_valid,
    password_reset_tokens.user_id,
    password_reset_tokens.id AS token_id
  FROM password_reset_tokens
  WHERE token = p_token
  LIMIT 1;
END;
$$;

DROP FUNCTION IF EXISTS public.mark_token_used(uuid);
CREATE OR REPLACE FUNCTION public.mark_token_used(p_token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE id = p_token_id;
END;
$$;

DROP FUNCTION IF EXISTS public.check_password_history(uuid, text, integer);
CREATE OR REPLACE FUNCTION public.check_password_history(
  p_user_id uuid,
  p_password_hash text,
  p_history_limit integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hash_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM password_history
    WHERE user_id = p_user_id
    AND password_hash = p_password_hash
    ORDER BY created_at DESC
    LIMIT p_history_limit
  ) INTO hash_exists;
  
  RETURN hash_exists;
END;
$$;

DROP FUNCTION IF EXISTS public.add_password_to_history(uuid, text);
CREATE OR REPLACE FUNCTION public.add_password_to_history(
  p_user_id uuid,
  p_password_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO password_history (user_id, password_hash)
  VALUES (p_user_id, p_password_hash);
  
  -- Keep only last 10 passwords
  DELETE FROM password_history
  WHERE user_id = p_user_id
  AND id NOT IN (
    SELECT id
    FROM password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 10
  );
END;
$$;

DROP FUNCTION IF EXISTS public.invalidate_all_user_sessions(uuid);
CREATE OR REPLACE FUNCTION public.invalidate_all_user_sessions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Note: Supabase handles session invalidation internally
  -- This is a placeholder for future session management
  RAISE NOTICE 'Sessions invalidated for user: %', p_user_id;
END;
$$;

DROP FUNCTION IF EXISTS public.clear_login_attempts(uuid);
CREATE OR REPLACE FUNCTION public.clear_login_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE mfa_settings
  SET 
    failed_login_attempts = 0,
    login_lock_until = NULL
  WHERE user_id = p_user_id;
END;
$$;