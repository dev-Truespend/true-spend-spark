-- Phase 7: Performance Indexes for Location Intelligence
-- These indexes optimize query performance for high-traffic operations

-- Geofence events: optimizes user timeline queries
CREATE INDEX IF NOT EXISTS idx_geofence_events_user_timestamp 
  ON geofence_events(user_id, timestamp DESC);

-- Location insights: optimizes dashboard priority sorting
CREATE INDEX IF NOT EXISTS idx_location_insights_user_priority 
  ON location_insights(user_id, priority DESC, created_at DESC);

-- Merchants cache: optimizes geohash-based spatial queries
CREATE INDEX IF NOT EXISTS idx_merchants_cache_geohash_expires
  ON merchants_cache_v2(geohash, expires_at);

-- Merchant recommendations: optimizes deal notification queries
CREATE INDEX IF NOT EXISTS idx_merchant_recommendations_user_viewed
  ON merchant_recommendations(user_id, expires_at, viewed);

-- Cache analytics: optimizes dashboard performance metrics
CREATE INDEX IF NOT EXISTS idx_cache_analytics_timestamp
  ON cache_analytics(timestamp DESC, cache_type);

-- Location analytics: optimizes period-based aggregation queries
CREATE INDEX IF NOT EXISTS idx_location_analytics_user_period
  ON location_analytics(user_id, period_end DESC);