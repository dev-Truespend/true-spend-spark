-- ============================================================================
-- TrueSpend v3.1.0 Security Hardening Migration - Part 1: Core Functions
-- ============================================================================
-- Enable pgcrypto extension and fix hash functions
-- ============================================================================

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate hash_pii function with proper extension references
CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  RETURN encode(public.digest(lower(trim(data)) || 'truespend_salt_2024', 'sha256'), 'hex');
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback if pgcrypto functions aren't available
    RAISE EXCEPTION 'pgcrypto extension not available';
END;
$function$;

-- Recreate hash_ip function with proper extension references
CREATE OR REPLACE FUNCTION public.hash_ip(ip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  RETURN encode(public.digest(ip || 'truespend_ip_salt_2024', 'sha256'), 'hex');
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback if pgcrypto functions aren't available
    RAISE EXCEPTION 'pgcrypto extension not available';
END;
$function$;