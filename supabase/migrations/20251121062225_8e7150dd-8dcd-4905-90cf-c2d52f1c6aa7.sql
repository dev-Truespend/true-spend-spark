-- Add model-specific metadata columns to ml_model_registry
ALTER TABLE ml_model_registry 
ADD COLUMN IF NOT EXISTS hyperparameters JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS training_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS training_samples_count INTEGER;

-- Create table for storing predictions/inference logs
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  prediction JSONB NOT NULL,
  confidence_score NUMERIC(5,4),
  inference_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_id ON ml_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_created_at ON ml_predictions(created_at);

-- Enable RLS
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies for ml_predictions
CREATE POLICY "Users can view their own predictions"
  ON ml_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert predictions"
  ON ml_predictions FOR INSERT
  WITH CHECK (true);

-- Update ml_model_registry comment
COMMENT ON TABLE ml_model_registry IS 'Registry of all trained ML models with their metadata, metrics, and deployment status';
COMMENT ON TABLE ml_predictions IS 'Log of all ML model predictions for monitoring and debugging';