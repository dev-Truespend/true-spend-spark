-- Create plaid_items table to store Plaid connection metadata
CREATE TABLE IF NOT EXISTS public.plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  institution_id TEXT,
  institution_name TEXT,
  status TEXT DEFAULT 'active',
  error_message TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_cards table to store individual card accounts
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plaid_item_id UUID REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL UNIQUE,
  account_name TEXT,
  account_mask TEXT,
  card_brand TEXT,
  current_balance DECIMAL(10,2) DEFAULT 0,
  available_credit DECIMAL(10,2) DEFAULT 0,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  apr_percentage DECIMAL(5,2),
  due_date DATE,
  minimum_payment DECIMAL(10,2),
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plaid_items
CREATE POLICY "Users can view own plaid items"
  ON public.plaid_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid items"
  ON public.plaid_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid items"
  ON public.plaid_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid items"
  ON public.plaid_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_cards
CREATE POLICY "Users can view own credit cards"
  ON public.credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit cards"
  ON public.credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit cards"
  ON public.credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit cards"
  ON public.credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON public.plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON public.plaid_items(item_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_account_id ON public.credit_cards(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_plaid_item_id ON public.credit_cards(plaid_item_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON public.plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();