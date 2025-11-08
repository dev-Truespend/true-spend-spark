-- ============================================
-- Enterprise Geofencing Tasks for Phase 2.5 & 5.5
-- Populates tasks table for tracking 5 refinements
-- ============================================

-- Get phase IDs
DO $$
DECLARE
  phase_2_5_id UUID;
  phase_5_5_id UUID;
BEGIN
  -- Get Phase 2.5 ID
  SELECT id INTO phase_2_5_id FROM phases WHERE name = 'Geofencing Foundation' LIMIT 1;
  
  -- Get Phase 5.5 ID
  SELECT id INTO phase_5_5_id FROM phases WHERE name = 'Location Intelligence' LIMIT 1;
  
  -- ========================================
  -- PHASE 2.5 TASKS (Weeks 8-10) - 17 tasks
  -- ========================================
  
  -- Week 8 - Database Schema & Security (6 tasks)
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria, dependencies) VALUES
  ('Create event_log table with RLS policies', 'Implement Event Bus foundation with event_log table, status tracking, retry logic, and Row Level Security policies for fault-tolerant event processing', phase_2_5_id, 8, 1, 'Not Started', 'Critical', 0, '["Layer 14 - Event Bus"]'::jsonb, '["Table created with proper indexes", "RLS policies configured", "Realtime enabled"]'::jsonb, '[]'::jsonb),
  
  ('Create geofence_rules table with priority indexing', 'Build Control Plane foundation with geofence_rules table for dynamic rule management, condition evaluation, and action triggers with priority-based execution', phase_2_5_id, 8, 1, 'Not Started', 'Critical', 0, '["Layer 7 - Edge Functions Gateway"]'::jsonb, '["Table created with rule schema", "Priority indexing configured", "Version tracking enabled"]'::jsonb, '[]'::jsonb),
  
  ('Create location_tokens table for nonce tracking', 'Implement JWT security foundation with location_tokens table for nonce-based replay attack prevention and token lifecycle management', phase_2_5_id, 8, 1, 'Not Started', 'Critical', 0, '["Layer 4 - Auth & Session", "Layer 12 - Control Plane"]'::jsonb, '["Table created with nonce uniqueness", "Expiration trigger configured", "Cleanup function created"]'::jsonb, '[]'::jsonb),
  
  ('Create geofence_metrics table for telemetry', 'Build Observability foundation with geofence_metrics table for real-time performance tracking, anomaly detection, and AI feedback loop integration', phase_2_5_id, 8, 1, 'Not Started', 'High', 0, '["Layer 16 - Observability"]'::jsonb, '["Table created with time-series design", "GIN indexes for dimensions", "Metric aggregation views"]'::jsonb, '[]'::jsonb),
  
  ('Create merchants_cache_v2 with geohash indexing', 'Implement Cache v2 foundation with merchants_cache_v2 table using geohash-based proximity search, TTL management, and versioning for high-performance merchant discovery', phase_2_5_id, 8, 1, 'Not Started', 'High', 0, '["Layer 10 - Egress Gateway", "Layer 15 - Database"]'::jsonb, '["Table created with geohash calculation", "Geohash indexes configured", "TTL expiration logic implemented"]'::jsonb, '[]'::jsonb),
  
  ('Implement Vault encryption for coordinates', 'Set up Supabase Vault encryption for location coordinates to ensure GDPR compliance and secure storage of sensitive geolocation data', phase_2_5_id, 8, 1, 'Not Started', 'Critical', 0, '["Layer 18 - Private Data Plane"]'::jsonb, '["Encryption key generated in Vault", "Encrypt/decrypt functions tested", "Integration with geofence_events table"]'::jsonb, '[]'::jsonb);
  
  -- Week 9 - Core Logic & Event Bus (6 tasks)
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria, dependencies) VALUES
  ('Build track-location edge function with JWT verification', 'Develop server-side edge function for location tracking with JWT token validation, geofence boundary detection, and encrypted coordinate storage', phase_2_5_id, 9, 1, 'Not Started', 'Critical', 0, '["Layer 7 - Edge Functions Gateway", "Layer 8 - Business Logic"]'::jsonb, '["JWT signature validation working", "Geofence boundary checks accurate", "Latency <200ms (p95)"]'::jsonb, '["Create location_tokens table for nonce tracking"]'::jsonb),
  
  ('Implement server-side nonce validation', 'Add replay attack prevention with nonce validation, token expiration checks, and secure token lifecycle management in track-location function', phase_2_5_id, 9, 1, 'Not Started', 'Critical', 0, '["Layer 4 - Auth & Session", "Layer 7 - Edge Functions Gateway"]'::jsonb, '["Nonce reuse blocked", "Token expiration enforced", "0% replay attack success rate"]'::jsonb, '["Create location_tokens table for nonce tracking"]'::jsonb),
  
  ('Build event-bus-processor edge function', 'Create event processor with queue polling, event routing, at-least-once delivery guarantees, and exponential backoff retry logic', phase_2_5_id, 9, 1, 'Not Started', 'Critical', 0, '["Layer 14 - Event Bus"]'::jsonb, '["Event routing working for all types", "Retry logic tested", "Processing latency <500ms (p95)"]'::jsonb, '["Create event_log table with RLS policies"]'::jsonb),
  
  ('Implement retry logic with exponential backoff', 'Add fault-tolerant event processing with configurable max retries, exponential backoff delays, and dead letter queue for failed events', phase_2_5_id, 9, 1, 'Not Started', 'High', 0, '["Layer 14 - Event Bus"]'::jsonb, '["Max 3 retries enforced", "Exponential backoff calculated", "DLQ for failed events after max retries"]'::jsonb, '["Build event-bus-processor edge function"]'::jsonb),
  
  ('Build control plane rule evaluation engine', 'Develop dynamic rule engine for geofence events with condition DSL parsing, priority-based execution, and configurable action triggers', phase_2_5_id, 9, 1, 'Not Started', 'High', 0, '["Layer 12 - Control Plane"]'::jsonb, '["Rule conditions evaluated correctly", "Actions triggered based on priority", "A/B testing scenarios supported"]'::jsonb, '["Create geofence_rules table with priority indexing"]'::jsonb),
  
  ('Add telemetry instrumentation to edge functions', 'Instrument all geofencing edge functions with metric logging for validation latency, error rates, cache hit ratios, and event processing performance', phase_2_5_id, 9, 1, 'Not Started', 'Medium', 0, '["Layer 16 - Observability"]'::jsonb, '["All operations instrumented", "Metrics flowing to geofence_metrics table", "Real-time dashboard receiving data"]'::jsonb, '["Create geofence_metrics table for telemetry"]'::jsonb);
  
  -- Week 10 - Integration & Testing (5 tasks)
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria, dependencies) VALUES
  ('Create client-side JWT token generator', 'Build locationSecurity.ts utility for client-side JWT token signing with nonce generation, Web Crypto API integration, and token submission to edge functions', phase_2_5_id, 10, 1, 'Not Started', 'Critical', 0, '["Layer 1 - Client", "Layer 4 - Auth & Session"]'::jsonb, '["Token generation working", "Nonce stored in database", "Token validated on server"]'::jsonb, '["Create location_tokens table for nonce tracking"]'::jsonb),
  
  ('Build useEventBus React hook for real-time events', 'Create React hook for subscribing to event_log realtime changes with automatic toast notifications for geofence events and merchant discoveries', phase_2_5_id, 10, 1, 'Not Started', 'High', 0, '["Layer 1 - Client", "Layer 14 - Event Bus"]'::jsonb, '["Realtime subscription working", "Events displayed to users", "Graceful error handling"]'::jsonb, '["Create event_log table with RLS policies"]'::jsonb),
  
  ('Create TelemetryDashboard component', 'Build React dashboard component with real-time metric visualization, aggregated stats, and performance KPI tracking for geofencing operations', phase_2_5_id, 10, 1, 'Not Started', 'Medium', 0, '["Layer 1 - Client", "Layer 16 - Observability"]'::jsonb, '["Dashboard renders metrics", "Real-time updates working", "Aggregations calculated correctly"]'::jsonb, '["Create geofence_metrics table for telemetry"]'::jsonb),
  
  ('Write security tests for JWT replay attacks', 'Develop comprehensive test suite for JWT security including replay attack prevention, nonce validation, token expiration, and signature verification', phase_2_5_id, 10, 1, 'Not Started', 'Critical', 0, '["Layer 4 - Auth & Session"]'::jsonb, '["Replay attack tests passing", "Nonce reuse blocked in tests", "Expired tokens rejected"]'::jsonb, '["Implement server-side nonce validation"]'::jsonb),
  
  ('Performance test: geofence validation <200ms', 'Load test geofence validation with 1000+ concurrent requests to ensure p95 latency stays under 200ms target for production readiness', phase_2_5_id, 10, 1, 'Not Started', 'High', 0, '["Layer 8 - Business Logic"]'::jsonb, '["p95 latency <200ms", "1000 concurrent requests handled", "No database connection pool exhaustion"]'::jsonb, '["Build track-location edge function with JWT verification"]'::jsonb);
  
  -- ========================================
  -- PHASE 5.5 TASKS (Weeks 23-25) - 8 tasks
  -- ========================================
  
  -- Week 23 - AI Integration (3 tasks)
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria, dependencies) VALUES
  ('Build ai-location-insights edge function with Lovable AI', 'Develop AI-powered edge function using Gemini 2.5 Flash for location pattern analysis, spending anomaly detection, and personalized merchant recommendations', phase_5_5_id, 23, 1, 'Not Started', 'High', 0, '["Layer 9 - AI Agents", "Layer 10 - Egress Gateway"]'::jsonb, '["AI model integration working", "Insights generated accurately", "Response time <3s"]'::jsonb, '["Create geofence_metrics table for telemetry"]'::jsonb),
  
  ('Integrate telemetry feedback into AI analysis', 'Connect geofence_metrics data to AI insights function for feedback loop, enabling model improvement based on actual user location behavior patterns', phase_5_5_id, 23, 1, 'Not Started', 'Medium', 0, '["Layer 9 - AI Agents", "Layer 16 - Observability"]'::jsonb, '["Telemetry data fed to AI model", "Insights improve over time", "Feedback loop operational"]'::jsonb, '["Build ai-location-insights edge function with Lovable AI"]'::jsonb),
  
  ('Implement spending pattern anomaly detection', 'Add AI-powered anomaly detection for unusual spending patterns based on location history, transaction amounts, and temporal patterns', phase_5_5_id, 23, 1, 'Not Started', 'Medium', 0, '["Layer 9 - AI Agents"]'::jsonb, '["Anomalies detected accurately", "False positive rate <5%", "Alerts sent within 1min"]'::jsonb, '["Build ai-location-insights edge function with Lovable AI"]'::jsonb);
  
  -- Week 24 - Cache v2 Optimization (3 tasks)
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria, dependencies) VALUES
  ('Migrate existing merchants to merchants_cache_v2', 'Migrate data from merchants table to merchants_cache_v2 with geohash calculation, location hash generation, and TTL assignment for all existing records', phase_5_5_id, 24, 1, 'Not Started', 'High', 0, '["Layer 10 - Egress Gateway", "Layer 15 - Database"]'::jsonb, '["All merchants migrated successfully", "Geohashes calculated correctly", "No data loss during migration"]'::jsonb, '["Create merchants_cache_v2 with geohash indexing"]'::jsonb),
  
  ('Implement geohash proximity search optimization', 'Optimize geohash-based proximity queries with prefix matching, distance filtering, and index usage for <50ms query performance', phase_5_5_id, 24, 1, 'Not Started', 'High', 0, '["Layer 10 - Egress Gateway", "Layer 15 - Database"]'::jsonb, '["Proximity queries <50ms (p95)", "Correct results within radius", "Index usage verified with EXPLAIN"]'::jsonb, '["Migrate existing merchants to merchants_cache_v2"]'::jsonb),
  
  ('Add cache versioning and TTL management', 'Implement cache versioning for blue-green deployments, automated TTL expiration, and cache invalidation strategies for stale merchant data', phase_5_5_id, 24, 1, 'Not Started', 'Medium', 0, '["Layer 10 - Egress Gateway"]'::jsonb, '["Versioning working correctly", "Expired cache auto-purged", "Cache invalidation on demand"]'::jsonb, '["Migrate existing merchants to merchants_cache_v2"]'::jsonb);
  
  -- Week 25 - Analytics & Performance (2 tasks)
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria, dependencies) VALUES
  ('Build location analytics dashboard with heatmaps', 'Create interactive dashboard with location heatmaps, spending density visualization, and time-based pattern analysis for business intelligence', phase_5_5_id, 25, 1, 'Not Started', 'Medium', 0, '["Layer 1 - Client", "Layer 16 - Observability"]'::jsonb, '["Heatmap renders correctly", "Real-time updates working", "Performance optimized for large datasets"]'::jsonb, '["Create geofence_metrics table for telemetry"]'::jsonb),
  
  ('Optimize cache hit ratio to >80%', 'Fine-tune cache strategies including TTL values, geohash precision, prefetching patterns, and eviction policies to achieve >80% cache hit ratio', phase_5_5_id, 25, 1, 'Not Started', 'High', 0, '["Layer 10 - Egress Gateway"]'::jsonb, '["Cache hit ratio >80%", "API cost reduced by 60%+", "Latency improved by 70%+"]'::jsonb, '["Implement geohash proximity search optimization"]'::jsonb);

END $$;