-- Add plaid_transaction_id to transactions for reliable removal handling
-- Phase 6 — Payment / Plaid hardening

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS pending BOOLEAN NOT NULL DEFAULT FALSE;

-- Unique constraint so Plaid's TRANSACTIONS_REMOVED can delete by ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_plaid_id
  ON public.transactions(plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;

-- Index for pending lookup
CREATE INDEX IF NOT EXISTS idx_transactions_pending
  ON public.transactions(pending)
  WHERE pending = TRUE;
