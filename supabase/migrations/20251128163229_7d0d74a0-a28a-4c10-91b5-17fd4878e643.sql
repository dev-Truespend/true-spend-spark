-- Add credit_card_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_id ON public.transactions(credit_card_id);