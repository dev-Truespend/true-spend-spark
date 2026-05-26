-- Production Launch: Add Feature Flags for Phased Rollout
-- This allows gradual activation of Phase 1 features post-launch

-- Insert feature flags for Phase 1 features (disabled by default)
INSERT INTO feature_flags (flag_name, enabled, config) VALUES
  ('offline_storage', false, '{"rollout_percentage": 0, "description": "Enable IndexedDB offline storage and sync"}'),
  ('ocr_extraction', false, '{"rollout_percentage": 0, "description": "Enable receipt OCR using the AI agent"}'),
  ('adaptive_loading', false, '{"rollout_percentage": 0, "description": "Enable network-aware request optimization"}'),
  ('geofencing', false, '{"rollout_percentage": 0, "description": "Enable location-based budgets and alerts"}')
ON CONFLICT (flag_name) DO UPDATE SET
  config = EXCLUDED.config;

-- Update Phase 1 to 70% (new code added but not integrated)
UPDATE phases 
SET 
  progress = 70,
  status = 'In Progress',
  updated_at = NOW()
WHERE phase_number = 1;

-- Ensure Phases 2, 4, 5 are marked as production-ready
UPDATE phases 
SET 
  progress = 100,
  status = 'Completed',
  updated_at = NOW()
WHERE phase_number IN (2, 4, 5);

-- Mark Phase 3 at 50% (partially complete)
UPDATE phases 
SET 
  progress = 50,
  status = 'In Progress',
  updated_at = NOW()
WHERE phase_number = 3;

-- Log production launch preparation
INSERT INTO security_logs (event_type, severity, details)
VALUES (
  'production_launch_preparation',
  'info',
  jsonb_build_object(
    'launch_strategy', 'option_a',
    'deployed_phases', ARRAY[2, 4, 5],
    'deferred_features', ARRAY['offline_storage', 'ocr_extraction', 'adaptive_loading', 'geofencing'],
    'timestamp', NOW()
  )
);