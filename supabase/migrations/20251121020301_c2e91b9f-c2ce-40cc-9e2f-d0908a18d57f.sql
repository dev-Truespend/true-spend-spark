-- Fix search_path for ML model registry function
CREATE OR REPLACE FUNCTION update_ml_model_registry_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;