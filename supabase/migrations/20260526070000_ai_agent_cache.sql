-- Cache expensive AI-agent responses by user, intent, and normalized payload.
-- This reduces Anthropic token usage, protects rate limits, and gives the UI
-- stable responses while financial data has not changed.

CREATE TABLE IF NOT EXISTS public.ai_agent_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_agent_cache_user_intent_payload_key
  ON public.ai_agent_cache(user_id, intent, payload_hash);

CREATE INDEX IF NOT EXISTS idx_ai_agent_cache_expires_at
  ON public.ai_agent_cache(expires_at);

ALTER TABLE public.ai_agent_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own ai agent cache" ON public.ai_agent_cache;
CREATE POLICY "users can read own ai agent cache"
  ON public.ai_agent_cache FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can manage own ai agent cache" ON public.ai_agent_cache;
CREATE POLICY "users can manage own ai agent cache"
  ON public.ai_agent_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service role manages ai agent cache" ON public.ai_agent_cache;
CREATE POLICY "service role manages ai agent cache"
  ON public.ai_agent_cache FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_ai_agent_cache_updated_at ON public.ai_agent_cache;
CREATE TRIGGER update_ai_agent_cache_updated_at
  BEFORE UPDATE ON public.ai_agent_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_agent_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_agent_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
