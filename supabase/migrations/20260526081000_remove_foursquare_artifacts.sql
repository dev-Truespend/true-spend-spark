-- Remove Foursquare-specific enrichment artifacts from the focused MVP.
-- Merchant intelligence now uses merchant_domains for website/extension
-- rewards recommendations. Google Maps/Places can be added later if needed.

DROP TABLE IF EXISTS public.merchant_foursquare_mapping CASCADE;
DROP TABLE IF EXISTS public.foursquare_api_logs CASCADE;
DROP TABLE IF EXISTS public.foursquare_categories CASCADE;
DROP TABLE IF EXISTS public.foursquare_places CASCADE;

ALTER TABLE IF EXISTS public.merchants
  DROP COLUMN IF EXISTS fsq_id,
  DROP COLUMN IF EXISTS foursquare_verified,
  DROP COLUMN IF EXISTS last_foursquare_sync;

DROP FUNCTION IF EXISTS public.cleanup_expired_foursquare_cache();
DROP FUNCTION IF EXISTS public.cleanup_old_foursquare_logs();
