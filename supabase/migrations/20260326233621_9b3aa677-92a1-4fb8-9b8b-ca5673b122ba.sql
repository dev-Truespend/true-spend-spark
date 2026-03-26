
ALTER TABLE public.plaid_items 
  ADD COLUMN IF NOT EXISTS sync_cursor text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS error_code text;
