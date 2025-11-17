-- Create transaction_rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on transaction_rules
ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can manage own transaction rules" ON public.transaction_rules;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Users can manage their own rules
CREATE POLICY "Users can manage own transaction rules"
  ON public.transaction_rules
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_transaction_rules_user_id ON public.transaction_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_active ON public.transaction_rules(active) WHERE active = true;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_transaction_rules_updated_at ON public.transaction_rules;
CREATE TRIGGER update_transaction_rules_updated_at
  BEFORE UPDATE ON public.transaction_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();