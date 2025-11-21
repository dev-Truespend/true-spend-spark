-- Add feature flags for Google Vision API
INSERT INTO feature_flags (flag_name, enabled, environment, metadata)
VALUES 
  ('google_vision_primary', true, 'production', '{"description": "Use Google Vision API as primary OCR provider"}'),
  ('google_vision_enabled', true, 'all', '{"description": "Enable Google Vision API for receipt processing"}')
ON CONFLICT (flag_name) DO UPDATE
SET 
  enabled = EXCLUDED.enabled,
  environment = EXCLUDED.environment,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();