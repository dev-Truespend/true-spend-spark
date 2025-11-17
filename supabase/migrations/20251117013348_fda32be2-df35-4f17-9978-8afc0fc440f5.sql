-- Add location_token column to geofence_events for JWT security
ALTER TABLE public.geofence_events 
ADD COLUMN IF NOT EXISTS location_token TEXT;

COMMENT ON COLUMN public.geofence_events.location_token IS 'JWT-signed location token for anti-spoofing (optional, enabled via feature flag)';