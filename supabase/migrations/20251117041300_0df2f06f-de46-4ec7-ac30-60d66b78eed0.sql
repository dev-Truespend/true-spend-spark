-- Fix search_path security warnings for Phase 7 functions

-- Fix cleanup_expired_insights function
DROP FUNCTION IF EXISTS cleanup_expired_insights();
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.location_insights
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Fix cleanup_expired_recommendations function
DROP FUNCTION IF EXISTS cleanup_expired_recommendations();
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.location_recommendations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Fix increment_cache_hit function
DROP FUNCTION IF EXISTS increment_cache_hit(UUID);
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.merchants_cache_v2
  SET hit_count = hit_count + 1,
      last_accessed = NOW()
  WHERE id = cache_id;
END;
$$;