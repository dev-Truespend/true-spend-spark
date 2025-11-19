-- Fix search_path for cleanup_old_extension_telemetry function
DROP FUNCTION IF EXISTS cleanup_old_extension_telemetry();

CREATE OR REPLACE FUNCTION cleanup_old_extension_telemetry()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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