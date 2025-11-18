-- Fix database function security: Add search_path to SECURITY DEFINER functions
-- This prevents SQL injection vulnerabilities and ensures functions operate in the correct schema

-- Update encrypt_totp_secret function
CREATE OR REPLACE FUNCTION public.encrypt_totp_secret(secret text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
  unique_name TEXT;
BEGIN
  unique_name := 'totp-secret-' || replace(gen_random_uuid()::text, '-', '');
  secret_id := vault.create_secret(secret, unique_name);
  RETURN secret_id;
EXCEPTION
  WHEN OTHERS THEN
    unique_name := 'totp-secret-' || substring(md5(random()::text), 1, 16);
    secret_id := vault.create_secret(secret, unique_name);
    RETURN secret_id;
END;
$$;

-- Update decrypt_totp_secret function
CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update encrypt_pii function
CREATE OR REPLACE FUNCTION public.encrypt_pii(data text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
BEGIN
  secret_id := vault.create_secret(data, 'pii-data');
  RETURN secret_id;
END;
$$;

-- Update decrypt_pii function
CREATE OR REPLACE FUNCTION public.decrypt_pii(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_data TEXT;
BEGIN
  SELECT decrypted_secret INTO decrypted_data
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  
  RETURN decrypted_data;
END;
$$;

-- Update delete_totp_vault_secret function
CREATE OR REPLACE FUNCTION public.delete_totp_vault_secret(secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;