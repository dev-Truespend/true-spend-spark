-- Phase 15: Advanced ML Models - Tables and Extensions

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Budget Optimization History (Thompson Sampling)
CREATE TABLE IF NOT EXISTS public.budget_optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  allocated_amount DECIMAL(10,2) NOT NULL,
  actual_spent DECIMAL(10,2) DEFAULT 0,
  confidence_score DECIMAL(5,4) NOT NULL,
  alpha_param DECIMAL(10,2) NOT NULL,
  beta_param DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_budget_opt_user_period ON public.budget_optimization_history(user_id, period_start, period_end);

ALTER TABLE public.budget_optimization_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their budget optimizations"
  ON public.budget_optimization_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their budget optimizations"
  ON public.budget_optimization_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Geofence Suggestions (K-Means++ Clustering)
CREATE TABLE IF NOT EXISTS public.geofence_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id INTEGER NOT NULL,
  center_lat DECIMAL(10,7) NOT NULL,
  center_lng DECIMAL(10,7) NOT NULL,
  radius_meters INTEGER NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  top_categories JSONB,
  confidence_score DECIMAL(5,4) NOT NULL,
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_geofence_sugg_user ON public.geofence_suggestions(user_id);
CREATE INDEX idx_geofence_sugg_status ON public.geofence_suggestions(user_id, status);

ALTER TABLE public.geofence_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their geofence suggestions"
  ON public.geofence_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their geofence suggestions"
  ON public.geofence_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their geofence suggestions"
  ON public.geofence_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Add embedding vector column to transactions for semantic search
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS embedding vector(384);

CREATE INDEX IF NOT EXISTS idx_transactions_embedding ON public.transactions 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Semantic Search History
CREATE TABLE IF NOT EXISTS public.semantic_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_embedding vector(384) NOT NULL,
  results_count INTEGER DEFAULT 0,
  avg_similarity DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_semantic_search_user ON public.semantic_search_history(user_id);

ALTER TABLE public.semantic_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their search history"
  ON public.semantic_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their search history"
  ON public.semantic_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update timestamp trigger for budget_optimization_history
CREATE TRIGGER update_budget_opt_timestamp
  BEFORE UPDATE ON public.budget_optimization_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for geofence_suggestions
CREATE TRIGGER update_geofence_sugg_timestamp
  BEFORE UPDATE ON public.geofence_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();