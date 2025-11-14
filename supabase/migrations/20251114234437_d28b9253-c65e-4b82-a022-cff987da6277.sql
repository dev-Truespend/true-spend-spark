-- Google Maps API Caching and Logging Tables

-- 1. Geocoding Cache Table (30-day TTL)
CREATE TABLE IF NOT EXISTS public.google_maps_geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  formatted_address TEXT,
  place_id TEXT,
  components JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_expires ON public.google_maps_geocode_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_place_id ON public.google_maps_geocode_cache(place_id);

-- 2. Google Places Cache Table (30-day TTL)
CREATE TABLE IF NOT EXISTS public.google_places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE NOT NULL,
  place_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON public.google_places_cache(expires_at);

-- 3. Google Maps API Logs Table (90-day retention)
CREATE TABLE IF NOT EXISTS public.google_maps_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  request_params JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maps_api_logs_created ON public.google_maps_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_maps_api_logs_user ON public.google_maps_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_maps_api_logs_type ON public.google_maps_api_logs(api_type);

-- 4. Update Geofences Table with Google Maps Data
ALTER TABLE public.geofences 
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS google_place_data JSONB;

CREATE INDEX IF NOT EXISTS idx_geofences_place_id ON public.geofences(place_id);

-- 5. Enable RLS on new tables
ALTER TABLE public.google_maps_geocode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_maps_api_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Geocode Cache (public read, system write)
CREATE POLICY "Anyone can read geocode cache"
  ON public.google_maps_geocode_cache
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage geocode cache"
  ON public.google_maps_geocode_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. RLS Policies for Places Cache (public read, system write)
CREATE POLICY "Anyone can read places cache"
  ON public.google_places_cache
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage places cache"
  ON public.google_places_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. RLS Policies for API Logs (admins view all, users view own)
CREATE POLICY "Admins can view all API logs"
  ON public.google_maps_api_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own API logs"
  ON public.google_maps_api_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert API logs"
  ON public.google_maps_api_logs
  FOR INSERT
  WITH CHECK (true);

-- 9. Cleanup Function for Expired Cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_google_maps_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  geocode_deleted INTEGER;
  places_deleted INTEGER;
BEGIN
  -- Delete expired geocode cache
  DELETE FROM public.google_maps_geocode_cache
  WHERE expires_at < NOW();
  GET DIAGNOSTICS geocode_deleted = ROW_COUNT;
  
  -- Delete expired places cache
  DELETE FROM public.google_places_cache
  WHERE expires_at < NOW();
  GET DIAGNOSTICS places_deleted = ROW_COUNT;
  
  -- Log cleanup
  INSERT INTO public.google_maps_api_logs (
    api_type,
    endpoint,
    response_status,
    cost_usd
  ) VALUES (
    'maintenance',
    'cache_cleanup',
    200,
    0
  );
  
  RETURN geocode_deleted + places_deleted;
END;
$$;

-- 10. Cleanup Function for Old API Logs
CREATE OR REPLACE FUNCTION public.cleanup_old_google_maps_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.google_maps_api_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;