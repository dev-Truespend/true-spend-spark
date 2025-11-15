-- Fix ambiguous column reference in decrypt_totp_secret function
CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT ds.decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets ds
  WHERE ds.id = secret_id;
  
  RETURN v_secret;
END;
$function$;