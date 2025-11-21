-- Add deployment tracking columns to ml_model_registry
ALTER TABLE public.ml_model_registry 
ADD COLUMN IF NOT EXISTS shadow_deployed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS production_deployed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shadow_traffic_split NUMERIC(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS shadow_deployed_at TIMESTAMPTZ;