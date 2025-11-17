-- Phase 7: Location Intelligence Database Schema
-- Creates all 11 tables with RLS policies and performance indexes

-- ============================================
-- 1. LOCATION INSIGHTS (AI Recommendations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.location_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('spending_pattern', 'budget_alert', 'merchant_recommendation', 'category_analysis', 'anomaly_detection')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}',
  actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_location_insights_user_id ON public.location_insights(user_id);
CREATE INDEX idx_location_insights_geofence_id ON public.location_insights(geofence_id);
CREATE INDEX idx_location_insights_created_at ON public.location_insights(created_at DESC);
CREATE INDEX idx_location_insights_priority ON public.location_insights(priority) WHERE actioned = false;

ALTER TABLE public.location_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.location_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON public.location_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert insights"
  ON public.location_insights FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 2. LOCATION RECOMMENDATIONS (Budget AI)
-- ============================================
CREATE TABLE IF NOT EXISTS public.location_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('budget_increase', 'budget_decrease', 'spending_alert', 'savings_opportunity', 'category_shift')),
  current_value NUMERIC(10,2),
  recommended_value NUMERIC(10,2),
  potential_savings NUMERIC(10,2),
  rationale TEXT NOT NULL,
  data_points_analyzed INTEGER,
  accepted BOOLEAN DEFAULT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_location_recommendations_user_id ON public.location_recommendations(user_id);
CREATE INDEX idx_location_recommendations_geofence_id ON public.location_recommendations(geofence_id);
CREATE INDEX idx_location_recommendations_created_at ON public.location_recommendations(created_at DESC);

ALTER TABLE public.location_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON public.location_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON public.location_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert recommendations"
  ON public.location_recommendations FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. MERCHANTS CACHE V2 (Geohash-indexed)
-- ============================================
CREATE TABLE IF NOT EXISTS public.merchants_cache_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geohash TEXT NOT NULL,
  geohash_precision INTEGER NOT NULL DEFAULT 7,
  merchant_data JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('foursquare', 'google_places', 'manual')),
  lat NUMERIC(10,8) NOT NULL,
  lng NUMERIC(11,8) NOT NULL,
  categories TEXT[],
  rating NUMERIC(2,1),
  price_tier INTEGER CHECK (price_tier BETWEEN 1 AND 4),
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_merchants_cache_geohash ON public.merchants_cache_v2(geohash);
CREATE INDEX idx_merchants_cache_location ON public.merchants_cache_v2(lat, lng);
CREATE INDEX idx_merchants_cache_expires_at ON public.merchants_cache_v2(expires_at);
CREATE INDEX idx_merchants_cache_categories ON public.merchants_cache_v2 USING GIN(categories);

ALTER TABLE public.merchants_cache_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read merchant cache"
  ON public.merchants_cache_v2 FOR SELECT
  USING (true);

CREATE POLICY "System can manage merchant cache"
  ON public.merchants_cache_v2 FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. MERCHANT RECOMMENDATIONS (Deals)
-- ============================================
CREATE TABLE IF NOT EXISTS public.merchant_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE CASCADE,
  recommendation_reason TEXT NOT NULL,
  deal_type TEXT CHECK (deal_type IN ('discount', 'loyalty', 'seasonal', 'first_time', 'time_limited')),
  deal_description TEXT,
  potential_savings NUMERIC(10,2),
  confidence_score NUMERIC(3,2),
  expires_at TIMESTAMPTZ,
  viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchant_recommendations_user_id ON public.merchant_recommendations(user_id);
CREATE INDEX idx_merchant_recommendations_merchant_id ON public.merchant_recommendations(merchant_id);
CREATE INDEX idx_merchant_recommendations_geofence_id ON public.merchant_recommendations(geofence_id);
CREATE INDEX idx_merchant_recommendations_created_at ON public.merchant_recommendations(created_at DESC);

ALTER TABLE public.merchant_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own merchant recommendations"
  ON public.merchant_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own merchant recommendations"
  ON public.merchant_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert merchant recommendations"
  ON public.merchant_recommendations FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. CACHE ANALYTICS (Performance Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cache_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_type TEXT NOT NULL CHECK (cache_type IN ('merchants', 'geocode', 'places', 'foursquare')),
  operation TEXT NOT NULL CHECK (operation IN ('hit', 'miss', 'eviction', 'refresh')),
  geohash TEXT,
  response_time_ms INTEGER,
  saved_api_cost_usd NUMERIC(10,4),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cache_analytics_timestamp ON public.cache_analytics(timestamp DESC);
CREATE INDEX idx_cache_analytics_cache_type ON public.cache_analytics(cache_type);
CREATE INDEX idx_cache_analytics_operation ON public.cache_analytics(operation);

ALTER TABLE public.cache_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cache analytics"
  ON public.cache_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert cache analytics"
  ON public.cache_analytics FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 6. LOCATION ANALYTICS (Aggregated Data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.location_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_visits INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  average_transaction NUMERIC(10,2),
  top_categories JSONB DEFAULT '[]',
  top_merchants JSONB DEFAULT '[]',
  spending_trend TEXT CHECK (spending_trend IN ('increasing', 'stable', 'decreasing')),
  budget_adherence_score NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_analytics_user_id ON public.location_analytics(user_id);
CREATE INDEX idx_location_analytics_geofence_id ON public.location_analytics(geofence_id);
CREATE INDEX idx_location_analytics_period ON public.location_analytics(period_start, period_end);

ALTER TABLE public.location_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location analytics"
  ON public.location_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage location analytics"
  ON public.location_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7. GEOFENCE HEATMAP DATA (Visualization)
-- ============================================
CREATE TABLE IF NOT EXISTS public.geofence_heatmap_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat NUMERIC(10,8) NOT NULL,
  lng NUMERIC(11,8) NOT NULL,
  intensity NUMERIC(10,2) NOT NULL,
  category TEXT,
  amount_spent NUMERIC(10,2),
  transaction_count INTEGER DEFAULT 1,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_heatmap_user_id ON public.geofence_heatmap_data(user_id);
CREATE INDEX idx_heatmap_location ON public.geofence_heatmap_data(lat, lng);
CREATE INDEX idx_heatmap_period ON public.geofence_heatmap_data(period_start, period_end);
CREATE INDEX idx_heatmap_category ON public.geofence_heatmap_data(category);

ALTER TABLE public.geofence_heatmap_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own heatmap data"
  ON public.geofence_heatmap_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage heatmap data"
  ON public.geofence_heatmap_data FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 8. AB EXPERIMENTS (Testing Framework)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name TEXT NOT NULL UNIQUE,
  description TEXT,
  variants JSONB NOT NULL,
  traffic_allocation JSONB NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  target_metric TEXT NOT NULL,
  minimum_sample_size INTEGER DEFAULT 100,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ab_experiments_status ON public.ab_experiments(status);
CREATE INDEX idx_ab_experiments_dates ON public.ab_experiments(start_date, end_date);

ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage experiments"
  ON public.ab_experiments FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active experiments"
  ON public.ab_experiments FOR SELECT
  USING (status = 'running');

-- ============================================
-- 9. USER EXPERIMENT ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, experiment_id)
);

CREATE INDEX idx_user_experiments_user_id ON public.user_experiment_assignments(user_id);
CREATE INDEX idx_user_experiments_experiment_id ON public.user_experiment_assignments(experiment_id);

ALTER TABLE public.user_experiment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own experiment assignments"
  ON public.user_experiment_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage assignments"
  ON public.user_experiment_assignments FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 10. EXPERIMENT METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS public.experiment_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiment_metrics_experiment_id ON public.experiment_metrics(experiment_id);
CREATE INDEX idx_experiment_metrics_user_id ON public.experiment_metrics(user_id);
CREATE INDEX idx_experiment_metrics_variant ON public.experiment_metrics(variant);
CREATE INDEX idx_experiment_metrics_recorded_at ON public.experiment_metrics(recorded_at DESC);

ALTER TABLE public.experiment_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all metrics"
  ON public.experiment_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert metrics"
  ON public.experiment_metrics FOR INSERT
  WITH CHECK (true);

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to update cache hit count
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.merchants_cache_v2
  SET hit_count = hit_count + 1,
      last_accessed = NOW()
  WHERE id = cache_id;
END;
$$;