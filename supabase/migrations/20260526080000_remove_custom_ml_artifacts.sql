-- Remove custom ML/training artifacts from the production MVP scope.
-- TrueSpend now uses deterministic rewards logic as the source of truth and
-- Claude only for explanations/classification drafts. Custom model training,
-- Hugging Face browser inference, Modal jobs, and model registries are out of
-- scope for the website + browser-extension MVP.

DROP TABLE IF EXISTS public.ml_predictions CASCADE;
DROP TABLE IF EXISTS public.ml_ab_tests CASCADE;
DROP TABLE IF EXISTS public.ml_training_jobs CASCADE;
DROP TABLE IF EXISTS public.ml_model_registry CASCADE;
DROP TABLE IF EXISTS public.semantic_search_history CASCADE;
DROP TABLE IF EXISTS public.budget_optimization_history CASCADE;

ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS embedding;

DELETE FROM storage.objects
WHERE bucket_id IN ('ml-models', 'training-data', 'ml-training-data');

DELETE FROM storage.buckets
WHERE id IN ('ml-models', 'training-data', 'ml-training-data');
