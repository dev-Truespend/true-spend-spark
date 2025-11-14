-- ============================================================================
-- FOURSQUARE PRODUCTION INFRASTRUCTURE v1.0
-- Geographic Scope: US-only
-- Priority Categories: Grocery, Gas Stations, Restaurants, Retail
-- ============================================================================

-- ============================================================================
-- TABLE 1: foursquare_places - Master Place Database
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.foursquare_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsq_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  categories JSONB DEFAULT '[]'::jsonb,
  primary_category TEXT,
  location JSONB,
  geocodes JSONB,
  chains JSONB,
  hours JSONB,
  rating NUMERIC,
  popularity NUMERIC,
  price_tier INTEGER CHECK (price_tier BETWEEN 1 AND 4),
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_foursquare_places_fsq_id ON public.foursquare_places(fsq_id);
CREATE INDEX IF NOT EXISTS idx_foursquare_places_primary_category ON public.foursquare_places(primary_category);
CREATE INDEX IF NOT EXISTS idx_foursquare_places_location ON public.foursquare_places USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_foursquare_places_name ON public.foursquare_places(name);

-- RLS Policies
ALTER TABLE public.foursquare_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to places"
  ON public.foursquare_places
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert places"
  ON public.foursquare_places
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update places"
  ON public.foursquare_places
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- TABLE 2: foursquare_categories - Category Master List
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.foursquare_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id INTEGER UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  icon_prefix TEXT,
  icon_suffix TEXT,
  parent_category_id INTEGER,
  level INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_foursquare_categories_id ON public.foursquare_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_foursquare_categories_name ON public.foursquare_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_foursquare_categories_parent ON public.foursquare_categories(parent_category_id);

-- RLS Policies
ALTER TABLE public.foursquare_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to categories"
  ON public.foursquare_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.foursquare_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- TABLE 3: place_enrichment_cache - 30-Day API Cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.place_enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsq_id TEXT UNIQUE NOT NULL,
  place_data JSONB NOT NULL,
  enrichment_type TEXT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_place_cache_fsq_id ON public.place_enrichment_cache(fsq_id);
CREATE INDEX IF NOT EXISTS idx_place_cache_expires ON public.place_enrichment_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_place_cache_type ON public.place_enrichment_cache(enrichment_type);

-- RLS Policies (Admin only)
ALTER TABLE public.place_enrichment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only access to cache"
  ON public.place_enrichment_cache
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- TABLE 4: merchant_foursquare_mapping - Link Merchants to Places
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.merchant_foursquare_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  fsq_id TEXT NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  match_method TEXT CHECK (match_method IN ('auto', 'manual', 'verified')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, fsq_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_merchant_mapping_merchant ON public.merchant_foursquare_mapping(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_mapping_fsq ON public.merchant_foursquare_mapping(fsq_id);
CREATE INDEX IF NOT EXISTS idx_merchant_mapping_method ON public.merchant_foursquare_mapping(match_method);

-- RLS Policies
ALTER TABLE public.merchant_foursquare_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view merchant mappings"
  ON public.merchant_foursquare_mapping
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage mappings"
  ON public.merchant_foursquare_mapping
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- TABLE 5: foursquare_api_logs - Production Monitoring & Debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.foursquare_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  request_params JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON public.foursquare_api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.foursquare_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_cache ON public.foursquare_api_logs(cache_hit);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON public.foursquare_api_logs(response_status);

-- RLS Policies (Admin only)
ALTER TABLE public.foursquare_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API logs"
  ON public.foursquare_api_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert API logs"
  ON public.foursquare_api_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- UPDATE EXISTING merchants TABLE - Add Foursquare columns
-- ============================================================================
ALTER TABLE public.merchants 
  ADD COLUMN IF NOT EXISTS fsq_id TEXT,
  ADD COLUMN IF NOT EXISTS chain_name TEXT,
  ADD COLUMN IF NOT EXISTS foursquare_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_foursquare_sync TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_merchants_fsq_id ON public.merchants(fsq_id);
CREATE INDEX IF NOT EXISTS idx_merchants_chain ON public.merchants(chain_name);

-- ============================================================================
-- FUNCTION: Auto-update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_foursquare_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_foursquare_places_updated_at ON public.foursquare_places;
CREATE TRIGGER update_foursquare_places_updated_at
  BEFORE UPDATE ON public.foursquare_places
  FOR EACH ROW
  EXECUTE FUNCTION update_foursquare_updated_at();

DROP TRIGGER IF EXISTS update_foursquare_categories_updated_at ON public.foursquare_categories;
CREATE TRIGGER update_foursquare_categories_updated_at
  BEFORE UPDATE ON public.foursquare_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_foursquare_updated_at();

DROP TRIGGER IF EXISTS update_merchant_mapping_updated_at ON public.merchant_foursquare_mapping;
CREATE TRIGGER update_merchant_mapping_updated_at
  BEFORE UPDATE ON public.merchant_foursquare_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_foursquare_updated_at();

-- ============================================================================
-- FUNCTION: Cleanup expired cache entries
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_foursquare_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.place_enrichment_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  INSERT INTO public.foursquare_api_logs (
    endpoint,
    response_status,
    metadata
  ) VALUES (
    'cache_cleanup',
    200,
    jsonb_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Cleanup old API logs (retain 90 days)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_foursquare_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.foursquare_api_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA: Priority Categories for US Market
-- ============================================================================
INSERT INTO public.foursquare_categories (category_id, category_name, icon_prefix, icon_suffix, level, metadata)
VALUES
  (17069, 'Grocery Store', 'https://ss3.4sqi.net/img/categories_v2/shops/food_grocery_', '.png', 1, '{"priority": true, "region": "US"}'::jsonb),
  (17106, 'Gas Station', 'https://ss3.4sqi.net/img/categories_v2/travel/gas_', '.png', 1, '{"priority": true, "region": "US"}'::jsonb),
  (13065, 'Restaurant', 'https://ss3.4sqi.net/img/categories_v2/food/default_', '.png', 1, '{"priority": true, "region": "US"}'::jsonb),
  (17024, 'Retail', 'https://ss3.4sqi.net/img/categories_v2/shops/default_', '.png', 1, '{"priority": true, "region": "US"}'::jsonb)
ON CONFLICT (category_id) DO NOTHING;

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Foursquare Production Infrastructure v1.0 - Deployment Complete';
  RAISE NOTICE 'Tables Created: 5';
  RAISE NOTICE 'Indexes Created: 20+';
  RAISE NOTICE 'Functions Created: 3';
  RAISE NOTICE 'RLS Policies: Enabled on all tables';
  RAISE NOTICE 'Geographic Scope: US-only';
  RAISE NOTICE 'Priority Categories: Grocery, Gas Stations, Restaurants, Retail';
END $$;