-- Fix remaining security warnings by adding search_path to all functions

-- Fix is_account_locked function
CREATE OR REPLACE FUNCTION public.is_account_locked(p_identifier text, OUT is_locked boolean, OUT lock_expires_at timestamp with time zone, OUT is_escalated boolean)
RETURNS record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  failed_15min INTEGER;
  failed_24h INTEGER;
  last_attempt_time TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*), MAX(created_at) INTO failed_15min, last_attempt_time
  FROM auth_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  SELECT COUNT(*) INTO failed_24h
  FROM auth_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND created_at > NOW() - INTERVAL '24 hours';
  
  IF failed_15min >= 5 THEN
    is_locked := true;
    lock_expires_at := last_attempt_time + INTERVAL '15 minutes';
    is_escalated := false;
    RETURN;
  END IF;
  
  IF failed_24h >= 20 THEN
    is_locked := true;
    lock_expires_at := NULL;
    is_escalated := true;
    RETURN;
  END IF;
  
  is_locked := false;
  lock_expires_at := NULL;
  is_escalated := false;
END;
$function$;

-- Fix record_login_attempt function
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_identifier text, p_success boolean, p_ip_address text, p_user_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix clear_login_attempts function
CREATE OR REPLACE FUNCTION public.clear_login_attempts(p_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM auth_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND attempt_type = 'login';
END;
$function$;

-- Fix cleanup_expired_google_maps_cache function
CREATE OR REPLACE FUNCTION public.cleanup_expired_google_maps_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  geocode_deleted INTEGER;
  places_deleted INTEGER;
BEGIN
  DELETE FROM google_maps_geocode_cache
  WHERE expires_at < NOW();
  GET DIAGNOSTICS geocode_deleted = ROW_COUNT;
  
  DELETE FROM google_places_cache
  WHERE expires_at < NOW();
  GET DIAGNOSTICS places_deleted = ROW_COUNT;
  
  INSERT INTO google_maps_api_logs (
    api_type,
    endpoint,
    response_status,
    cost_usd
  ) VALUES (
    'maintenance',
    'cache_cleanup',
    200,
    0
  );
  
  RETURN geocode_deleted + places_deleted;
END;
$function$;

-- Fix cleanup_old_google_maps_logs function
CREATE OR REPLACE FUNCTION public.cleanup_old_google_maps_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM google_maps_api_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;

-- Fix update_user_devices_updated_at function  
CREATE OR REPLACE FUNCTION public.update_user_devices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix validate_reset_token function
CREATE OR REPLACE FUNCTION public.validate_reset_token(p_token text)
RETURNS TABLE(is_valid boolean, user_id uuid, expires_at timestamp with time zone, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_token_record password_reset_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token_record
  FROM password_reset_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'This password reset link is invalid.'::TEXT;
    RETURN;
  END IF;

  IF v_token_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'This password reset link has already been used. Please request a new one.'::TEXT;
    RETURN;
  END IF;

  IF v_token_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'This password reset link has expired. Password reset links are valid for 30 minutes.'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_token_record.user_id, v_token_record.expires_at, NULL::TEXT;
END;
$function$;

-- Fix mark_token_used function
CREATE OR REPLACE FUNCTION public.mark_token_used(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE password_reset_tokens
  SET used_at = NOW()
  WHERE token = p_token;
END;
$function$;

-- Fix check_password_history function
CREATE OR REPLACE FUNCTION public.check_password_history(p_user_id uuid, p_password_hash text, p_history_count integer DEFAULT 3)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_match_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_match_count
  FROM (
    SELECT password_hash
    FROM password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_history_count
  ) recent_passwords
  WHERE password_hash = p_password_hash;

  RETURN v_match_count > 0;
END;
$function$;