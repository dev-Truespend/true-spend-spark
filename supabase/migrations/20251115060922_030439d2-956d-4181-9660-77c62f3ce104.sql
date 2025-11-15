-- Fix security warnings: Remove search_path override and use qualified names

-- Fix cleanup_unverified_accounts function
CREATE OR REPLACE FUNCTION public.cleanup_unverified_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Fix update_foursquare_updated_at function
CREATE OR REPLACE FUNCTION public.update_foursquare_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix cleanup_expired_foursquare_cache function
CREATE OR REPLACE FUNCTION public.cleanup_expired_foursquare_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Fix cleanup_old_foursquare_logs function
CREATE OR REPLACE FUNCTION public.cleanup_old_foursquare_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;