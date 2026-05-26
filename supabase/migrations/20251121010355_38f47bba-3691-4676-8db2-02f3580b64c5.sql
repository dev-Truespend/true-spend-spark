-- Add Hugging Face feature flags
-- All flags are disabled by default for safe rollout

-- Client-side categorization (browser-based ML)
INSERT INTO public.feature_flags (flag_name, enabled, environment, rollout_percentage, metadata)
VALUES (
  'hf_client_categorization_enabled',
  false,
  'production',
  0,
  '{"description": "Enable client-side transaction categorization using Hugging Face Transformers.js", "owner": "ai-team", "rollout_strategy": "gradual"}'::jsonb
)
ON CONFLICT (flag_name) DO NOTHING;

-- Server-side OCR fallback (when Claude AI agent is rate-limited)
INSERT INTO public.feature_flags (flag_name, enabled, environment, rollout_percentage, metadata)
VALUES (
  'hf_server_ocr_fallback',
  false,
  'production',
  0,
  '{"description": "Enable Hugging Face OCR as fallback when primary AI OCR fails or rate-limited", "owner": "ai-team", "fallback_only": true}'::jsonb
)
ON CONFLICT (flag_name) DO NOTHING;

-- Use HF as primary OCR provider (advanced setting)
INSERT INTO public.feature_flags (flag_name, enabled, environment, rollout_percentage, metadata)
VALUES (
  'hf_primary_for_ocr',
  false,
  'production',
  0,
  '{"description": "Use Hugging Face as primary OCR provider instead of the legacy AI provider", "owner": "ai-team", "advanced": true}'::jsonb
)
ON CONFLICT (flag_name) DO NOTHING;