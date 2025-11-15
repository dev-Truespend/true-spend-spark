-- Fix the final batch of functions

-- Fix encryption/decryption functions
CREATE OR REPLACE FUNCTION public.encrypt_totp_secret(secret text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  secret_id UUID;
BEGIN
  secret_id := vault.create_secret(secret, 'totp-secret');
  RETURN secret_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  decrypted_secret TEXT;
BEGIN
  SELECT vault.decrypted_secrets.decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  
  RETURN decrypted_secret;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_totp_vault_secret(secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$function$;

-- Fix role functions (already have search_path but let me ensure they're correct)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT ARRAY_AGG(role)
  FROM user_roles
  WHERE user_id = _user_id
$function$;

-- Fix PII functions
CREATE OR REPLACE FUNCTION public.encrypt_pii(data text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  secret_id UUID;
BEGIN
  secret_id := vault.create_secret(data, 'pii-data');
  RETURN secret_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  decrypted_data TEXT;
BEGIN
  SELECT decrypted_secret INTO decrypted_data
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  
  RETURN decrypted_data;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  RETURN encode(digest(lower(trim(data)) || 'truespend_salt_2024', 'sha256'), 'hex');
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_ip(ip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  RETURN encode(digest(ip || 'truespend_ip_salt_2024', 'sha256'), 'hex');
END;
$function$;

-- Fix migration function
CREATE OR REPLACE FUNCTION public.migrate_existing_pii_to_encrypted()
RETURNS TABLE(migrated_count integer, error_count integer, errors jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_migrated INTEGER := 0;
  v_errors INTEGER := 0;
  v_error_log JSONB := '[]'::JSONB;
BEGIN
  FOR v_profile IN 
    SELECT id, email, phone, first_name, last_name, pending_new_email
    FROM profiles
    WHERE email_encrypted IS NULL
  LOOP
    BEGIN
      IF v_profile.email IS NOT NULL THEN
        UPDATE profiles
        SET 
          email_encrypted = public.encrypt_pii(v_profile.email),
          email_hash = public.hash_pii(v_profile.email)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.phone IS NOT NULL THEN
        UPDATE profiles
        SET 
          phone_encrypted = public.encrypt_pii(v_profile.phone),
          phone_hash = public.hash_pii(v_profile.phone)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.first_name IS NOT NULL THEN
        UPDATE profiles
        SET first_name_encrypted = public.encrypt_pii(v_profile.first_name)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.last_name IS NOT NULL THEN
        UPDATE profiles
        SET last_name_encrypted = public.encrypt_pii(v_profile.last_name)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.pending_new_email IS NOT NULL THEN
        UPDATE profiles
        SET 
          pending_new_email_encrypted = public.encrypt_pii(v_profile.pending_new_email),
          pending_new_email_hash = public.hash_pii(v_profile.pending_new_email)
        WHERE id = v_profile.id;
      END IF;

      v_migrated := v_migrated + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_log := v_error_log || jsonb_build_object(
        'user_id', v_profile.id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_migrated, v_errors, v_error_log;
END;
$function$;

-- Fix get_decrypted_profile function
CREATE OR REPLACE FUNCTION public.get_decrypted_profile(p_user_id uuid)
RETURNS TABLE(id uuid, email text, phone text, first_name text, last_name text, full_name text, pending_new_email text, status text, auth_provider text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(public.decrypt_pii(p.email_encrypted), p.email) as email,
    public.decrypt_pii(p.phone_encrypted) as phone,
    public.decrypt_pii(p.first_name_encrypted) as first_name,
    public.decrypt_pii(p.last_name_encrypted) as last_name,
    p.full_name,
    public.decrypt_pii(p.pending_new_email_encrypted) as pending_new_email,
    p.status,
    p.auth_provider,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$function$;

-- Fix cleanup functions
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mfa_email_codes
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_csp_violations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM csp_violations
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;