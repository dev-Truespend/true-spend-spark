-- Fix search_path security warnings for hash functions

CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  -- Try to use SHA-256 from pgcrypto if available
  RETURN encode(public.digest(lower(trim(data)) || 'truespend_salt_2024', 'sha256'), 'hex');
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback to md5 if pgcrypto is not available
    RETURN md5(lower(trim(data)) || 'truespend_salt_2024');
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_ip(ip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  -- Try to use SHA-256 from pgcrypto if available
  RETURN encode(public.digest(ip || 'truespend_ip_salt_2024', 'sha256'), 'hex');
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback to md5 if pgcrypto is not available
    RETURN md5(ip || 'truespend_ip_salt_2024');
END;
$function$;