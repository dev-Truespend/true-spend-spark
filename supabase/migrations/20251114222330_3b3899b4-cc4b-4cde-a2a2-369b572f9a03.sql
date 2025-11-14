-- Fix search_path security warnings for Foursquare functions
ALTER FUNCTION update_foursquare_updated_at() SET search_path = 'public';
ALTER FUNCTION cleanup_expired_foursquare_cache() SET search_path = 'public';
ALTER FUNCTION cleanup_old_foursquare_logs() SET search_path = 'public';