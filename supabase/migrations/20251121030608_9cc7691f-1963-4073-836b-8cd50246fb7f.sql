-- Create ml_ab_tests table for A/B testing models
CREATE TABLE IF NOT EXISTS public.ml_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  model_a_id TEXT NOT NULL,
  model_b_id TEXT NOT NULL,
  traffic_split NUMERIC(3,2) DEFAULT 0.5,
  status TEXT DEFAULT 'running' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  winner TEXT,
  metrics JSONB DEFAULT '{}'::JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ml_ab_tests ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything
CREATE POLICY "Admins can manage ML A/B tests"
ON public.ml_ab_tests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ml_ab_tests_status ON public.ml_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ml_ab_tests_started_at ON public.ml_ab_tests(started_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_ml_ab_tests_updated_at
  BEFORE UPDATE ON public.ml_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();