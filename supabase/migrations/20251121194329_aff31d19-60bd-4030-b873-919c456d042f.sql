-- Fix security issues identified by linter
-- 1. Fix function with mutable search_path (cleanup_old_extension_telemetry)
-- 2. Document extension in public schema (vector extension is intentional for AI/ML features)

-- Fix: cleanup_old_extension_telemetry - set immutable search_path
DROP FUNCTION IF EXISTS public.cleanup_old_extension_telemetry();

CREATE OR REPLACE FUNCTION public.cleanup_old_extension_telemetry()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- Immutable search_path for security
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.extension_telemetry
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comment explaining why vector extension is in public schema
COMMENT ON EXTENSION vector IS 'pgvector extension for AI/ML embedding storage. Located in public schema for application-level access. This is intentional and required for machine learning features.';

-- Add monitoring view for extension telemetry cleanup
CREATE OR REPLACE VIEW public.extension_telemetry_stats AS
SELECT 
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '90 days') as active_records,
  COUNT(*) FILTER (WHERE timestamp < NOW() - INTERVAL '90 days') as expired_records,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record
FROM public.extension_telemetry;

COMMENT ON VIEW public.extension_telemetry_stats IS 'Statistics for extension telemetry data retention and cleanup monitoring';