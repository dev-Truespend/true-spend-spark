-- Drop and recreate the encrypt_totp_secret function to use unique secret names
DROP FUNCTION IF EXISTS public.encrypt_totp_secret(text);

CREATE OR REPLACE FUNCTION public.encrypt_totp_secret(secret text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  secret_id UUID;
  unique_name TEXT;
BEGIN
  -- Generate a unique name using random UUID to avoid collisions
  unique_name := 'totp-secret-' || replace(gen_random_uuid()::text, '-', '');
  
  -- Create the secret with unique name
  secret_id := vault.create_secret(secret, unique_name);
  
  RETURN secret_id;
EXCEPTION
  WHEN OTHERS THEN
    -- If gen_random_uuid fails, fall back to md5 with random
    unique_name := 'totp-secret-' || substring(md5(random()::text), 1, 16);
    secret_id := vault.create_secret(secret, unique_name);
    RETURN secret_id;
END;
$$;