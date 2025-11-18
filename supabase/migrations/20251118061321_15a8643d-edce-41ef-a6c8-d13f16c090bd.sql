-- Ensure seed data exists for 4 default SLOs
-- This will insert only if the SLO doesn't already exist
INSERT INTO public.service_level_objectives (name, description, slo_type, target_value, comparison_operator, time_window, priority, metadata) VALUES
  (
    'API Availability',
    'API endpoints must be available 99.9% of the time',
    'availability',
    99.9,
    '>=',
    '7d',
    'critical',
    '{"unit": "%", "calculation": "successful_requests / total_requests * 100"}'::jsonb
  ),
  (
    'API Latency P95',
    '95th percentile API response time must be under 150ms',
    'latency',
    150,
    '<=',
    '7d',
    'high',
    '{"unit": "ms", "calculation": "percentile_95(response_time_ms)"}'::jsonb
  ),
  (
    'Error Rate',
    'API error rate must be below 0.1%',
    'error_rate',
    0.1,
    '<=',
    '7d',
    'high',
    '{"unit": "%", "calculation": "error_requests / total_requests * 100"}'::jsonb
  ),
  (
    'Auth Success Rate',
    'Authentication success rate must be above 99%',
    'success_rate',
    99.0,
    '>=',
    '7d',
    'critical',
    '{"unit": "%", "calculation": "successful_auth / total_auth * 100"}'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  slo_type = EXCLUDED.slo_type,
  target_value = EXCLUDED.target_value,
  comparison_operator = EXCLUDED.comparison_operator,
  time_window = EXCLUDED.time_window,
  priority = EXCLUDED.priority,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();