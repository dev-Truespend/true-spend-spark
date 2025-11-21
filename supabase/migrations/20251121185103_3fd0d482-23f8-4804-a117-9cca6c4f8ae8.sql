-- Fix search_path for update_ocr_queue_timestamp function
DROP TRIGGER IF EXISTS update_ocr_queue_updated_at ON ocr_processing_queue;
DROP TRIGGER IF EXISTS update_tier_config_updated_at ON user_tier_config;

DROP FUNCTION IF EXISTS update_ocr_queue_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_ocr_queue_timestamp()
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

-- Recreate triggers with the fixed function
CREATE TRIGGER update_ocr_queue_updated_at
  BEFORE UPDATE ON ocr_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_ocr_queue_timestamp();

CREATE TRIGGER update_tier_config_updated_at
  BEFORE UPDATE ON user_tier_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ocr_queue_timestamp();