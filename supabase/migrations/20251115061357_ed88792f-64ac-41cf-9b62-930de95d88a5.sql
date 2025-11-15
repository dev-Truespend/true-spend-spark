-- Fix vault-related encryption functions

-- Fix encrypt_totp_secret
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

-- Fix decrypt_totp_secret
CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  decrypted_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  
  RETURN decrypted_secret;
END;
$function$;

-- Fix delete_totp_vault_secret
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

-- Fix encrypt_pii
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

-- Fix decrypt_pii
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

-- Fix get_decrypted_profile
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