-- Create ML Model Registry table
CREATE TABLE IF NOT EXISTS public.ml_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL, -- 'dqn_cache', 'lstm_anomaly', 'distilbert', 'als_recommender'
  version TEXT NOT NULL,
  artifact_url TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'ml-models',
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'training', -- 'training', 'trained', 'deployed', 'shadow', 'archived'
  metrics JSONB,
  training_config JSONB,
  trained_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ML Training Jobs table
CREATE TABLE IF NOT EXISTS public.ml_training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,
  modal_job_id TEXT,
  training_data_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  logs_url TEXT,
  resulting_model_id TEXT REFERENCES public.ml_model_registry(model_id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ml_model_registry_model_type ON public.ml_model_registry(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_model_registry_status ON public.ml_model_registry(status);
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_status ON public.ml_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_model_type ON public.ml_training_jobs(model_type);

-- Enable RLS
ALTER TABLE public.ml_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_training_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ml_model_registry
CREATE POLICY "Admin users can view all models"
  ON public.ml_model_registry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert models"
  ON public.ml_model_registry
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update models"
  ON public.ml_model_registry
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for ml_training_jobs
CREATE POLICY "Admin users can view all training jobs"
  ON public.ml_training_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can create training jobs"
  ON public.ml_training_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update training jobs"
  ON public.ml_training_jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ml_model_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ml_model_registry_updated_at
  BEFORE UPDATE ON public.ml_model_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_model_registry_updated_at();

CREATE TRIGGER update_ml_training_jobs_updated_at
  BEFORE UPDATE ON public.ml_training_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_model_registry_updated_at();