-- Fix remaining database functions missing search_path security setting

-- 1. Fix cleanup_expired_foursquare_cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_foursquare_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.place_enrichment_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO public.foursquare_api_logs (
    endpoint,
    response_status,
    request_params
  ) VALUES (
    'cache_cleanup',
    200,
    jsonb_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$function$;

-- 2. Fix cleanup_old_foursquare_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_foursquare_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.foursquare_api_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 3. Fix cleanup_unverified_accounts
CREATE OR REPLACE FUNCTION public.cleanup_unverified_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET 
    status = 'deleted',
    deleted_at = NOW()
  WHERE 
    status = 'pending_verification'
    AND verification_expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO public.security_logs (
    event_type,
    severity,
    details
  )
  VALUES (
    'auto_delete_unverified_accounts',
    'info',
    jsonb_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$function$;