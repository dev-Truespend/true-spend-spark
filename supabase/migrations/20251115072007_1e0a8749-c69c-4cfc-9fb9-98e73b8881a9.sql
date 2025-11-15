-- ============================================================================
-- TrueSpend v3.1.1 - Database Hotfix: Safe Hash Functions
-- ============================================================================
-- Fix hash_pii and hash_ip to gracefully handle missing pgcrypto extension
-- This prevents signup failures when pgcrypto is unavailable

-- Drop and recreate hash_pii with fallback to md5
DROP FUNCTION IF EXISTS public.hash_pii(text);
CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Try to use SHA-256 from pgcrypto if available
  RETURN encode(public.digest(lower(trim(data)) || 'truespend_salt_2024', 'sha256'), 'hex');
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback to md5 if pgcrypto is not available
    RETURN md5(lower(trim(data)) || 'truespend_salt_2024');
END;
$$;

-- Drop and recreate hash_ip with fallback to md5
DROP FUNCTION IF EXISTS public.hash_ip(ip text);
CREATE OR REPLACE FUNCTION public.hash_ip(ip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Try to use SHA-256 from pgcrypto if available
  RETURN encode(public.digest(ip || 'truespend_ip_salt_2024', 'sha256'), 'hex');
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback to md5 if pgcrypto is not available
    RETURN md5(ip || 'truespend_ip_salt_2024');
END;
$$;

-- Log the fix
INSERT INTO public.security_logs (event_type, severity, details) VALUES (
  'database_hotfix_v3.1.1',
  'info',
  jsonb_build_object(
    'timestamp', NOW(),
    'changes', jsonb_build_array(
      'Fixed hash_pii to gracefully fallback to md5 if pgcrypto unavailable',
      'Fixed hash_ip to gracefully fallback to md5 if pgcrypto unavailable',
      'Prevents signup failures due to missing pgcrypto extension'
    )
  )
);