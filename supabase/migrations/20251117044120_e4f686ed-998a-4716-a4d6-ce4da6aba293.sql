-- Fix database functions missing search_path security setting

-- 1. Fix increment_cache_hit
CREATE OR REPLACE FUNCTION public.increment_cache_hit(cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.merchants_cache_v2
  SET hit_count = hit_count + 1,
      last_accessed = NOW()
  WHERE id = cache_id;
END;
$function$;

-- 2. Fix cleanup_expired_insights
CREATE OR REPLACE FUNCTION public.cleanup_expired_insights()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.location_insights
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 3. Fix cleanup_expired_recommendations
CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.location_recommendations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 4. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 5. Fix update_notification_preferences_updated_at
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;