CREATE OR REPLACE FUNCTION public.encrypt_pii(data text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  secret_id UUID;
  unique_name TEXT;
BEGIN
  unique_name := 'pii-' || replace(gen_random_uuid()::text, '-', '');
  secret_id := vault.create_secret(data, unique_name);
  RETURN secret_id;
EXCEPTION
  WHEN OTHERS THEN
    unique_name := 'pii-' || substring(md5(random()::text), 1, 16);
    secret_id := vault.create_secret(data, unique_name);
    RETURN secret_id;
END;
$function$;